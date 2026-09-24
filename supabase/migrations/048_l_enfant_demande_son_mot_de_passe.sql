-- L'enfant demande, ses adultes répondent — par courriel ou dans l'application.
--
-- Un enfant n'a pas d'adresse, et c'est voulu : une adresse serait un canal
-- vers lui qui ne passe pas par la plateforme. Sa demande part donc chez tous
-- les adultes qui lui sont rattachés, de deux façons à la fois :
--
--   — un courriel avec un lien, qu'ils peuvent ouvrir de n'importe où ;
--   — une carte dans leur espace, visible à leur prochaine connexion.
--
-- Les deux mènent au même endroit et la première utilisée ferme l'autre. Le
-- courriel dépend d'un service d'envoi ; la carte, non. L'enfant n'est donc
-- jamais bloqué par le courrier.
--
-- Dix minutes, et pas davantage. Une demande de mot de passe qui traîne toute
-- la journée est une porte ouverte : quiconque met la main sur le téléphone du
-- parent dans l'intervalle prend le compte de l'enfant.
create table if not exists demandes_mot_de_passe (
  id         uuid primary key default gen_random_uuid(),
  eleve_id   uuid not null references profils(id) on delete cascade,
  cree_le    timestamptz not null default now(),
  expire_le  timestamptz not null default now() + interval '10 minutes',
  utilise_le timestamptz,
  utilise_par uuid references profils(id) on delete set null
);

create index if not exists demandes_mdp_par_eleve
  on demandes_mot_de_passe (eleve_id, cree_le desc);

alter table demandes_mot_de_passe enable row level security;

-- Les adultes rattachés voient les demandes de leurs enfants. Personne
-- n'écrit directement : tout passe par les fonctions ci-dessous.
drop policy if exists "un adulte voit les demandes de ses enfants" on demandes_mot_de_passe;
create policy "un adulte voit les demandes de ses enfants" on demandes_mot_de_passe
  for select to authenticated
  using (est_mon_enfant(eleve_id) or est_admin());

-- ── L'enfant demande ────────────────────────────────────────────────────────
-- Sans être connecté : c'est tout le propos, il a perdu son mot de passe.
--
-- Ne dit JAMAIS si le compte existe, ni s'il a des adultes rattachés. Sinon ce
-- champ deviendrait un annuaire des enfants inscrits, et pire : il dirait
-- lesquels sont seuls.
create or replace function demander_nouveau_mot_de_passe(nom_enfant text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  enfant uuid;
begin
  select id into enfant from profils
   where lower(identifiant) = normaliser_identifiant(nom_enfant)
     and role = 'eleve';

  if enfant is null then return; end if;

  -- Aucun adulte rattaché : rien à envoyer, et on le tait. L'écran a déjà
  -- prévenu l'enfant à l'inscription que personne ne pourrait l'aider.
  if not exists (
    select 1 from liens_familiaux
     where eleve_id = enfant and actif_le <= now()
  ) then
    return;
  end if;

  -- Une demande en cours suffit : redemander dix fois ne crée pas dix portes.
  if exists (
    select 1 from demandes_mot_de_passe
     where eleve_id = enfant and utilise_le is null and expire_le > now()
  ) then
    return;
  end if;

  insert into demandes_mot_de_passe (eleve_id) values (enfant);
end; $$;

-- ── Ce que l'adulte voit ────────────────────────────────────────────────────
create or replace function demandes_de_mot_de_passe()
returns table (id uuid, eleve_id uuid, prenom text, nom text, expire_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.eleve_id, p.prenom, p.nom, d.expire_le
    from demandes_mot_de_passe d
    join profils p on p.id = d.eleve_id
   where est_mon_enfant(d.eleve_id)
     and d.utilise_le is null
     and d.expire_le > now()
   order by d.cree_le desc;
$$;

-- ── L'adulte pose le nouveau mot de passe ───────────────────────────────────
create or replace function poser_mot_de_passe_enfant(demande uuid, nouveau text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  moi uuid := auth.uid();
  d   demandes_mot_de_passe;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if length(coalesce(nouveau, '')) < 6 then
    raise exception 'Le mot de passe doit faire au moins 6 caractères';
  end if;

  select * into d from demandes_mot_de_passe
   where id = demande and utilise_le is null and expire_le > now()
   for update;

  if d.id is null then
    raise exception 'Cette demande n''est plus valable' using errcode = '53400';
  end if;

  -- Le lien doit être PLEIN. Quelqu'un qui vient de se faire reconnaître ne
  -- prend pas le compte de l'enfant dans les quarante-huit heures.
  if not exists (
    select 1 from liens_familiaux
     where parent_id = moi and eleve_id = d.eleve_id and actif_le <= now()
  ) and not est_admin() then
    raise exception 'Cet enfant ne vous est pas rattaché' using errcode = '42501';
  end if;

  update auth.users
     set encrypted_password = crypt(nouveau, gen_salt('bf')),
         updated_at = now()
   where id = d.eleve_id;

  -- La demande se ferme. Le courriel parti chez les autres adultes ne vaut
  -- plus rien : la première réponse clôt la question, des deux côtés.
  update demandes_mot_de_passe
     set utilise_le = now(), utilise_par = moi
   where id = demande;

  insert into journal_admin (admin_id, action, cible_type, cible_id)
  values (moi, 'mot_de_passe_enfant_reinitialise', 'compte', d.eleve_id);
end; $$;

grant execute on function demander_nouveau_mot_de_passe(text) to anon, authenticated;
grant execute on function demandes_de_mot_de_passe() to authenticated;
grant execute on function poser_mot_de_passe_enfant(uuid, text) to authenticated;
