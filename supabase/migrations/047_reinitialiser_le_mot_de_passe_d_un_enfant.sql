-- Un adulte redonne un mot de passe à son enfant.
--
-- L'écran d'inscription prévient l'enfant : « tant qu'aucun adulte n'est
-- rattaché à ton compte, personne ne pourra retrouver ton mot de passe ».
-- C'était vrai — et ça restait vrai même une fois un adulte rattaché, faute
-- de ce qui suit. L'enfant qui oubliait était perdu pour de bon, avec sa
-- mémoire d'apprentissage et toutes ses séances.
--
-- Pas de courriel : l'enfant n'en a pas, et c'est voulu. C'est l'adulte,
-- connecté à son propre compte, qui pose le nouveau mot de passe. Le cas
-- courant est d'ailleurs celui-là — l'enfant est dans la même maison.
--
-- Trois conditions, et aucune n'est facultative :
--   — l'appelant est un adulte rattaché à cet enfant ;
--   — le lien est PLEIN, pas provisoire. Sinon quelqu'un qui vient de se
--     faire reconnaître prendrait le compte dans les quarante-huit heures ;
--   — la cible est bien un enfant. On ne redonne pas le mot de passe d'un
--     adulte, fût-il rattaché.
create or replace function reinitialiser_mot_de_passe_enfant(
  enfant uuid,
  nouveau text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if length(coalesce(nouveau, '')) < 6 then
    raise exception 'Le mot de passe doit faire au moins 6 caractères';
  end if;

  if not exists (
    select 1 from profils where id = enfant and role = 'eleve'
  ) then
    raise exception 'Ce compte n''est pas celui d''un enfant'
      using errcode = '42501';
  end if;

  -- Le lien doit être plein. `actif_le` porte les quarante-huit heures.
  if not exists (
    select 1 from liens_familiaux
     where parent_id = moi and eleve_id = enfant and actif_le <= now()
  ) and not est_admin() then
    raise exception 'Cet enfant ne vous est pas rattaché' using errcode = '42501';
  end if;

  update auth.users
     set encrypted_password = crypt(nouveau, gen_salt('bf')),
         updated_at = now()
   where id = enfant;

  -- Au registre, toujours : reprendre la main sur le compte d'un enfant est
  -- exactement le genre de geste dont on veut savoir qui l'a fait et quand.
  insert into journal_admin (admin_id, action, cible_type, cible_id)
  values (moi, 'mot_de_passe_enfant_reinitialise', 'compte', enfant);
end; $$;

revoke all on function reinitialiser_mot_de_passe_enfant(uuid, text) from public, anon;
grant execute on function reinitialiser_mot_de_passe_enfant(uuid, text) to authenticated;
