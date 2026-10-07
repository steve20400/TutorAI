-- Ouvrir une séance, et la rejoindre.
--
-- La salle existe depuis la migration 072, et personne ne peut y entrer :
-- aucun écran ne crée de séance, et aucun ne dit qu'il y en a une d'ouverte.
-- Une salle qu'on ne peut pas ouvrir est une salle qui n'existe pas.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI UNE FONCTION, ET PAS UNE SIMPLE REQUÊTE
--
-- Pour afficher « Séance de mathématiques avec Junior », il faut le PRÉNOM de
-- l'autre. Or un répétiteur ne peut pas lire le profil de son élève : la
-- politique de la migration 029 ne l'ouvre qu'à soi-même, à ses enfants et à
-- l'administration. C'est juste, et il ne faut pas l'élargir — ouvrir
-- `profils` aux répétiteurs leur donnerait l'annuaire des enfants inscrits.
--
-- Cette fonction est donc la porte, et elle est étroite : elle ne rend QUE le
-- prénom, QUE pour les personnes avec qui l'appelant a un contrat, et rien
-- d'autre. Pas le nom de famille, pas le téléphone, pas l'adresse — un
-- répétiteur n'a besoin de rien de tout cela pour faire un cours.
--
-- ─────────────────────────────────────────────────────────────────────────
-- QUI OUVRE, QUI REJOINT
--
-- Le répétiteur ouvre. Le parent n'a pas à démarrer la séance, et surtout il
-- ne doit pas pouvoir la clore : une séance qu'on peut terminer sans trace est
-- une séance qu'on peut effacer. C'est déjà la règle du service ; on la pose
-- aussi en base, parce qu'une règle qui ne vit que dans une route se contourne
-- en appelant PostgREST directement.
--
-- L'élève et le parent REJOIGNENT. Ils ne créent rien : ils voient qu'une
-- séance est ouverte, et ils entrent.

begin;

/**
 * Les cours de l'appelant, avec ce qu'il faut pour entrer en salle.
 *
 * Une ligne par contrat accepté et non terminé. `seance_ouverte` porte la
 * séance en cours s'il y en a une — c'est elle qui transforme un cours en
 * bouton « Rejoindre ».
 *
 * `autre_prenom` dit l'autre partie : l'élève vu du répétiteur, le répétiteur
 * vu de l'élève et du parent. Un seul mot, celui dont on a besoin pour
 * reconnaître la ligne.
 */
create or replace function mes_cours()
returns table (
  contrat_id uuid,
  matiere text,
  mon_role text,
  autre_prenom text,
  seance_ouverte uuid,
  ouverte_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.matiere,
    case
      when c.repetiteur_id = auth.uid() then 'repetiteur'
      when c.eleve_id = auth.uid() then 'eleve'
      else 'parent'
    end,
    -- Le prénom de l'autre. Pour le parent, c'est le répétiteur : il sait déjà
    -- comment s'appelle son enfant, et c'est le nom qu'il ne connaît pas qui
    -- l'aide à reconnaître la ligne.
    (select p.prenom from profils p
      where p.id = case when c.repetiteur_id = auth.uid()
                        then c.eleve_id
                        else c.repetiteur_id end),
    s.id,
    s.demarree_le
  from contrats c
  left join lateral (
    select sh.id, sh.demarree_le
      from seances_humaines sh
     where sh.contrat_id = c.id
       and sh.terminee_le is null
       and sh.demarree_le is not null
     order by sh.demarree_le desc
     limit 1
  ) s on true
  where c.statut = 'accepte'
    and c.termine_le is null
    and (
      c.repetiteur_id = auth.uid()
      or c.eleve_id = auth.uid()
      or c.parent_id = auth.uid()
    )
  order by s.demarree_le desc nulls last, c.cree_le desc;
$$;

revoke all on function mes_cours() from public, anon;
grant execute on function mes_cours() to authenticated;

/**
 * Ouvrir une séance. Le répétiteur, et lui seul.
 *
 * Rend la séance déjà ouverte s'il y en a une : cliquer deux fois sur
 * « Ouvrir » ne doit pas créer deux salles, et c'est exactement ce qui arrive
 * sur une connexion lente où le premier clic semble sans effet.
 *
 * La règle vit ici et pas seulement dans le service : une route se contourne
 * en appelant PostgREST directement, une fonction `security definer` qui
 * vérifie elle-même ne se contourne pas.
 */
create or replace function ouvrir_seance(contrat uuid, lecon text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  deja uuid;
  nouvelle uuid;
begin
  if not exists (
    select 1 from contrats
     where id = contrat
       and repetiteur_id = auth.uid()
       and statut = 'accepte'
       and termine_le is null
  ) then
    raise exception 'Seul le répétiteur de ce contrat ouvre la séance'
      using errcode = '42501';
  end if;

  select id into deja
    from seances_humaines
   where contrat_id = contrat and terminee_le is null and demarree_le is not null
   order by demarree_le desc limit 1;

  if deja is not null then
    return deja;
  end if;

  insert into seances_humaines (contrat_id, lecon_id, demarree_le)
  values (contrat, nullif(trim(coalesce(lecon, '')), ''), now())
  returning id into nouvelle;

  return nouvelle;
end; $$;

revoke all on function ouvrir_seance(uuid, text) from public, anon;
grant execute on function ouvrir_seance(uuid, text) to authenticated;

/**
 * Clore une séance. Le répétiteur, et lui seul.
 *
 * Une séance close ne se rouvre pas et ne se réécrit plus : c'est ce qui
 * sépare un cahier d'une pièce. Le parent ne peut pas clore — une séance qu'on
 * peut terminer sans trace est une séance qu'on peut effacer.
 */
create or replace function clore_seance(seance uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update seances_humaines s
     set terminee_le = now()
    from contrats c
   where s.id = seance
     and c.id = s.contrat_id
     and c.repetiteur_id = auth.uid()
     and s.terminee_le is null;

  if not found then
    raise exception 'Cette séance ne peut pas être close' using errcode = '42501';
  end if;
end; $$;

revoke all on function clore_seance(uuid) from public, anon;
grant execute on function clore_seance(uuid) to authenticated;

-- L'élève et le parent doivent voir la séance s'ouvrir sans recharger : ils
-- attendent, et rafraîchir pour savoir si le cours a commencé n'est pas une
-- façon d'attendre.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'seances_humaines'
  ) then
    alter publication supabase_realtime add table seances_humaines;
  end if;
end $$;

commit;
