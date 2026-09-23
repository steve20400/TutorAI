-- L'administration se connecte par identifiant OU par adresse.
--
-- Le compte portait `galilee@tutorai.app`, une adresse qui n'existe pas :
-- personne ne la relève, et aucune réinitialisation ne pourrait y parvenir.
-- Elle devient l'adresse réelle de l'administrateur.
--
-- Les deux entrées fonctionnent ensuite sans rien changer au code : le
-- formulaire détecte l'absence d'arobase et résout l'identifiant par
-- `email_par_identifiant`. « GALILEE » et l'adresse mènent au même compte.
--
-- `auth.identities` porte une copie de l'adresse dans `identity_data`. La
-- laisser en arrière ne casse pas la connexion par mot de passe, mais fait
-- diverger deux sources sur la même vérité — et c'est celle-là que lira un
-- jour la réinitialisation.
do $$
declare
  compte uuid;
begin
  select u.id into compte
  from auth.users u join profils p on p.id = u.id
  where p.identifiant = 'GALILEE';

  if compte is null then
    raise notice 'Aucun compte GALILEE : rien à faire.';
    return;
  end if;

  update auth.users
  set email = 'steveaurelmanfo@gmail.com',
      email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = compte;

  update auth.identities
  set identity_data = identity_data
        || jsonb_build_object('email', 'steveaurelmanfo@gmail.com')
  where user_id = compte;
end $$;
