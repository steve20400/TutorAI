-- Le porte-monnaie de jetons.
--
-- Il naît ÉTEINT, comme le porte-monnaie d'argent. L'allumer aujourd'hui
-- arrêterait tout le monde à la seconde, faute de crédit — et un compteur qui
-- coupe sans prévenir est pire que pas de compteur.
--
-- Il compte, il ne facture pas. La facturation viendra avec la société.
insert into parametres (cle, valeur, libelle) values
  ('jetons_actifs', 'false'::jsonb,
   'Plafonner les jetons des comptes — exige des crédits attribués')
on conflict (cle) do nothing;

-- ── La réserve de chacun ────────────────────────────────────────────────────
create table if not exists credits (
  compte_id uuid primary key references profils(id) on delete cascade,
  jetons    bigint not null default 0,
  /**
   * Pour l'enfant venu seul : une dotation ET une échéance, le premier atteint
   * des deux. La dotation seule se garde indéfiniment ; l'échéance seule
   * laisse un usage illimité jusqu'au dernier jour.
   */
  echeance  timestamptz,
  formule   text not null default 'essai' check (formule in ('essai', 'abonnement')),
  maj_le    timestamptz not null default now()
);

alter table credits enable row level security;

-- Chacun voit sa réserve ; un adulte voit celle de ses enfants, puisque c'est
-- lui qui la remplira. L'écriture n'appartient qu'à l'administration : un
-- solde qu'on peut s'attribuer soi-même n'est pas un solde.
drop policy if exists "voir sa reserve" on credits;
create policy "voir sa reserve" on credits
  for select to authenticated
  using (compte_id = auth.uid() or est_mon_enfant(compte_id) or est_admin());

drop policy if exists "l'administration attribue" on credits;
create policy "l'administration attribue" on credits
  for all to authenticated
  using (est_admin()) with check (est_admin());

-- ── Qui fournit, et qui porte ───────────────────────────────────────────────
alter table liens_familiaux
  add column if not exists fournit boolean not null default true;

comment on column liens_familiaux.fournit is
  'L''adulte accepte de fournir les jetons de cet enfant. Parents séparés, '
  'oncle rattaché par courtoisie : sans cet interrupteur, on importerait des '
  'conflits de famille dans l''application.';

alter table liens_familiaux
  add column if not exists porte boolean not null default false;

comment on column liens_familiaux.porte is
  'L''adulte que l''enfant a choisi pour porter ses séances. Quand sa réserve '
  's''épuise, on passe au suivant tout seul, et on le DIT à l''enfant.';

-- ── Qui paie pour cet élève ─────────────────────────────────────────────────
-- Celui qu'il a choisi s'il lui reste des jetons ; sinon le premier adulte
-- qui en a ; sinon l'élève lui-même, sur sa dotation.
create or replace function payeur_pour(eleve uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select l.parent_id
       from liens_familiaux l
       join credits c on c.compte_id = l.parent_id
      where l.eleve_id = eleve
        and l.fournit
        and l.actif_le <= now()
        and c.jetons > 0
        and (c.echeance is null or c.echeance > now())
      order by l.porte desc, c.jetons desc
      limit 1),
    eleve
  );
$$;

-- ── Dépenser ────────────────────────────────────────────────────────────────
-- Rend le solde restant du payeur. Une réserve absente vaut zéro : c'est le
-- cas d'un enfant venu seul à qui personne n'a rien donné, et il doit être
-- traité comme tel et non comme un crédit infini.
create or replace function debiter_jetons(payeur uuid, combien integer)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  reste bigint;
begin
  update credits
     set jetons = greatest(jetons - greatest(combien, 0), 0),
         maj_le = now()
   where compte_id = payeur
  returning jetons into reste;

  return coalesce(reste, 0);
end; $$;

-- ── Ce qu'il reste, sans dire combien ───────────────────────────────────────
-- Un enfant ne doit pas voir un compteur : « il te reste 18 400 jetons » ne
-- veut rien dire, et en ferait un comptable. « Tu as gaspillé les jetons de
-- papa » n'est pas une conversation qu'on veut créer dans une famille.
create or replace function jauge_de_l_eleve(eleve uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not coalesce((select (valeur #>> '{}')::boolean from parametres
                        where cle = 'jetons_actifs'), false) then 'illimite'
    when coalesce((select c.jetons from credits c
                    where c.compte_id = payeur_pour(eleve)), 0) = 0 then 'epuise'
    when coalesce((select c.jetons from credits c
                    where c.compte_id = payeur_pour(eleve)), 0) < 20000 then 'bientot'
    else 'large'
  end;
$$;

grant execute on function payeur_pour(uuid) to authenticated;
grant execute on function jauge_de_l_eleve(uuid) to authenticated;
grant execute on function debiter_jetons(uuid, integer) to service_ia;
revoke execute on function debiter_jetons(uuid, integer) from public, anon, authenticated;
