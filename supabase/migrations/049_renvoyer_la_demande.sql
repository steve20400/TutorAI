-- Renvoyer une demande de mot de passe.
--
-- Dix minutes passent vite : la connexion coupe, le parent n'était pas là, le
-- courriel arrive en retard. Sans moyen de recommencer, l'enfant reste dehors
-- alors que tout fonctionne.
--
-- Redemander ne crée pas une deuxième porte : la précédente se ferme à la
-- seconde. Deux demandes vivantes en même temps, c'est deux liens valables
-- pour un seul besoin — et le plus ancien traîne dans une boîte de courriel
-- longtemps après avoir été oublié.
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

  -- La précédente se ferme, toujours. C'est ce qui fait de « redemander » un
  -- renvoi et non une accumulation.
  update demandes_mot_de_passe
     set expire_le = now()
   where eleve_id = enfant and utilise_le is null and expire_le > now();

  insert into demandes_mot_de_passe (eleve_id) values (enfant);
end; $$;

-- ── L'adulte renvoie, depuis sa carte ───────────────────────────────────────
-- Le même geste, mais depuis l'espace d'un adulte déjà connecté : il n'a pas
-- le nom de connexion de l'enfant sous les yeux, et il ne devrait pas avoir à
-- le demander.
create or replace function renvoyer_demande_mot_de_passe(enfant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if not exists (
    select 1 from liens_familiaux
     where parent_id = moi and eleve_id = enfant and actif_le <= now()
  ) and not est_admin() then
    raise exception 'Cet enfant ne vous est pas rattaché' using errcode = '42501';
  end if;

  update demandes_mot_de_passe
     set expire_le = now()
   where eleve_id = enfant and utilise_le is null and expire_le > now();

  insert into demandes_mot_de_passe (eleve_id) values (enfant);
end; $$;

grant execute on function renvoyer_demande_mot_de_passe(uuid) to authenticated;
