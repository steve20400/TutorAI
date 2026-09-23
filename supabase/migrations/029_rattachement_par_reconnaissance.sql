-- Un adulte demande, l'enfant reconnaît.
--
-- Le geste évident aurait été de faire saisir à l'adulte le nom ET le mot de
-- passe de l'enfant : c'est la preuve la plus forte qu'on puisse demander.
-- C'est aussi la pire, parce qu'elle apprend à chaque enfant de la plateforme
-- que donner son mot de passe à un adulte qui l'aide est la procédure
-- normale. Le jour où un répétiteur le lui demande, l'enfant n'a plus aucun
-- moyen de distinguer l'abus. Et celui qui a le mot de passe ne se rattache
-- pas seulement : il se connecte à la place de l'enfant.
--
-- Donc l'inverse. L'adulte saisit le nom de connexion — qui n'est pas un
-- secret — et n'obtient rien. L'enfant, lui, voit un visage et un prénom, et
-- répond oui ou non. Reconnaître un visage est la seule chose qu'un enfant
-- fasse mieux qu'un adulte.

-- ── Le signalement peut viser quelqu'un ─────────────────────────────────────
alter table signalements add column if not exists cible_id uuid references profils(id) on delete set null;

-- ── Un lien peut être provisoire ────────────────────────────────────────────
-- Quarante-huit heures pendant lesquelles le nouvel adulte ne voit que le
-- prénom de l'enfant : ni séances, ni enregistrements, ni mémoire
-- d'apprentissage. C'est le temps qu'il faut à un vrai parent pour
-- s'apercevoir de quelque chose.
alter table liens_familiaux add column if not exists actif_le timestamptz not null default now();

-- Les liens déjà là ont été créés par le parent lui-même : ils sont pleins.
update liens_familiaux set actif_le = cree_le where actif_le > cree_le;

-- `est_mon_enfant` commande l'accès aux séances, aux messages, à la mémoire.
-- Elle ne répond donc oui que pour un lien devenu plein.
create or replace function est_mon_enfant(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from liens_familiaux
    where parent_id = auth.uid() and eleve_id = cible and actif_le <= now()
  );
$$;

-- Celle-ci répond oui dès le lien posé, et ne sert qu'à voir un prénom.
create or replace function est_mon_enfant_provisoire(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from liens_familiaux
    where parent_id = auth.uid() and eleve_id = cible
  );
$$;

drop policy if exists "lire son profil" on profils;
create policy "lire son profil" on profils
  for select to authenticated
  using (
    id = auth.uid()
    or est_mon_enfant(id)
    -- Un lien encore provisoire donne le prénom et la photo, rien de plus :
    -- tout le reste passe par `est_mon_enfant`, qui attend les 48 heures.
    or est_mon_enfant_provisoire(id)
    or est_admin()
  );

-- ── Les demandes ────────────────────────────────────────────────────────────
create table if not exists demandes_rattachement (
  id          uuid primary key default gen_random_uuid(),
  adulte_id   uuid not null references profils(id) on delete cascade,
  eleve_id    uuid not null references profils(id) on delete cascade,
  etat        text not null default 'en_attente'
              check (etat in ('en_attente', 'acceptee', 'refusee')),
  cree_le     timestamptz not null default now(),
  repondu_le  timestamptz,
  unique (adulte_id, eleve_id)
);

alter table demandes_rattachement enable row level security;

-- Personne n'écrit ni ne lit cette table directement : tout passe par les
-- trois fonctions ci-dessous, qui savent de quel droit elles agissent.
-- L'administration lit, pour voir venir ce qui doit l'inquiéter.
drop policy if exists "l'administration voit les demandes" on demandes_rattachement;
create policy "l'administration voit les demandes" on demandes_rattachement
  for select to authenticated
  using (est_admin());

-- ── Demander ────────────────────────────────────────────────────────────────
-- Ne dit JAMAIS si le compte existe. Un adulte qui essaierait des noms au
-- hasard obtient exactement la même réponse dans tous les cas — sans quoi la
-- fonction devient un annuaire des enfants inscrits.
create or replace function demander_rattachement(nom_enfant text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi    uuid := auth.uid();
  enfant uuid;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if not exists (select 1 from profils where id = moi and role = 'parent') then
    raise exception 'Seul un compte adulte rattache un enfant'
      using errcode = '42501';
  end if;

  select id into enfant from profils
  where lower(identifiant) = normaliser_identifiant(nom_enfant)
    and role = 'eleve';

  -- Silence volontaire à partir d'ici : aucune des conditions suivantes ne
  -- doit se distinguer de l'autre vue du dehors.
  if enfant is null then return; end if;
  if exists (select 1 from liens_familiaux where parent_id = moi and eleve_id = enfant) then return; end if;
  if exists (select 1 from demandes_rattachement where adulte_id = moi and eleve_id = enfant) then return; end if;

  -- Trois demandes en attente au maximum par enfant : sans ce plafond,
  -- quelqu'un couvre la file d'un enfant et le décourage de tout refuser.
  if (select count(*) from demandes_rattachement
       where eleve_id = enfant and etat = 'en_attente') >= 3 then
    return;
  end if;

  insert into demandes_rattachement (adulte_id, eleve_id) values (moi, enfant);
end; $$;

-- ── Ce que l'enfant voit ────────────────────────────────────────────────────
-- Un prénom, un nom, une photo. Ni adresse, ni téléphone : cet écran ne doit
-- pas devenir un moyen d'apprendre comment joindre un adulte hors d'ici.
create or replace function demandes_a_reconnaitre()
returns table (id uuid, prenom text, nom text, photo_url text, cree_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, p.prenom, p.nom, p.photo_url, d.cree_le
  from demandes_rattachement d
  join profils p on p.id = d.adulte_id
  where d.eleve_id = auth.uid() and d.etat = 'en_attente'
  order by d.cree_le;
$$;

-- ── Répondre ────────────────────────────────────────────────────────────────
create or replace function repondre_rattachement(demande uuid, oui boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d       demandes_rattachement;
  refus   int;
  plafond int;
begin
  select * into d from demandes_rattachement
  where id = demande and eleve_id = auth.uid() and etat = 'en_attente';

  if d.id is null then
    raise exception 'Cette demande n''existe pas' using errcode = '42501';
  end if;

  if oui then
    update demandes_rattachement
       set etat = 'acceptee', repondu_le = now() where id = demande;

    -- Provisoire pendant 48 heures.
    insert into liens_familiaux (parent_id, eleve_id, actif_le)
    values (d.adulte_id, d.eleve_id, now() + interval '48 hours')
    on conflict (parent_id, eleve_id) do nothing;
    return;
  end if;

  -- Un refus ne se voit pas. La demande reste « en attente » du côté de
  -- l'adulte, pour toujours : refuser ne coûte donc rien à l'enfant, et celui
  -- qui essaie n'obtient aucun signal qui lui dirait de s'y prendre autrement.
  update demandes_rattachement
     set etat = 'refusee', repondu_le = now() where id = demande;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'refus_avant_signalement'), 10)
    into plafond;

  select count(*) into refus from demandes_rattachement
   where adulte_id = d.adulte_id and etat = 'refusee';

  -- Au plafond, l'administration est prévenue. Quelqu'un qui essaie des noms
  -- jusqu'à ce qu'un enfant se trompe laisse cette trace-là et pas une autre.
  if refus >= plafond and not exists (
       select 1 from signalements
        where cible_id = d.adulte_id and statut = 'nouveau'
          and motif like 'rattachements refuses%') then
    insert into signalements (auteur_id, cible_id, motif, statut)
    values (null, d.adulte_id,
            'rattachements refuses : ' || refus || ' demandes refusees par des enfants',
            'nouveau');
  end if;
end; $$;

insert into parametres (cle, valeur, libelle)
values ('refus_avant_signalement', '10'::jsonb,
        'Refus de rattachement avant qu''un adulte soit signalé')
on conflict (cle) do nothing;

revoke all on function demander_rattachement(text) from public;
revoke all on function repondre_rattachement(uuid, boolean) from public;
grant execute on function demander_rattachement(text) to authenticated;
grant execute on function repondre_rattachement(uuid, boolean) to authenticated;
grant execute on function demandes_a_reconnaitre() to authenticated;
