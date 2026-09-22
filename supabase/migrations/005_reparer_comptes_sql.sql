-- Un administrateur créé en SQL ne pouvait pas se connecter.
--
-- GoTrue, le service d'authentification de Supabase, lit une dizaine de
-- colonnes de `auth.users` dans des chaînes de caractères non nullables. Une
-- inscription normale les remplit avec '' ; un `insert` écrit à la main les
-- laisse à NULL, et le service échoue au scan de la ligne — avant même de
-- comparer le mot de passe. L'erreur renvoyée ne dit rien d'utile :
--
--   500 unexpected_failure — « Database error querying schema »
--
-- Elle est identique pour un mot de passe juste et pour un mot de passe faux,
-- ce qui rend la panne très difficile à lire de l'extérieur : on croit s'être
-- trompé de mot de passe, et on le ressaisit indéfiniment.
--
-- Ce n'est pas un cas de bord. Le déclencheur d'inscription refuse le rôle
-- `admin` — exprès, pour que personne ne se le donne — donc TOUT compte
-- administrateur naît forcément d'un `insert` en SQL, et tombe donc forcément
-- dans ce trou. Le premier administrateur de la plateforme ne pouvait pas
-- entrer chez lui.

update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  email_change               = coalesce(email_change, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change_token_current is null
   or email_change is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;

-- GoTrue exige aussi une ligne dans `auth.identities` : sans elle, le compte
-- existe mais n'a aucun moyen de se connecter rattaché.
insert into auth.identities
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email,
                          'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
from auth.users u
where u.email is not null
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- Pour que le prochain administrateur ne repasse pas par là.
--
-- Le mot de passe n'est pas un paramètre par accident : il est haché ici et
-- n'apparaît donc jamais en clair ailleurs que dans l'appel. Appeler cette
-- fonction depuis psql laisse une trace dans l'historique du shell — la vider
-- après coup fait partie de l'opération.
create or replace function creer_administrateur(
  courriel text,
  mot_de_passe text,
  identifiant_admin text,
  prenom_admin text default 'Administration'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  nouvel_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change,
    phone_change_token, reauthentication_token)
  values (
    '00000000-0000-0000-0000-000000000000', nouvel_id, 'authenticated',
    'authenticated', courriel, crypt(mot_de_passe, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('prenom', prenom_admin, 'identifiant', identifiant_admin),
    now(), now(), '', '', '', '', '', '', '', '');

  insert into auth.identities
    (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (nouvel_id::text, nouvel_id,
    jsonb_build_object('sub', nouvel_id::text, 'email', courriel,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  -- Le déclencheur d'inscription a déjà posé le profil en 'eleve' : le rôle
  -- `admin` ne s'écrit qu'ici, hors de portée de qui que ce soit d'autre.
  update profils set role = 'admin', identifiant = identifiant_admin
  where id = nouvel_id;

  return nouvel_id;
end; $$;

revoke all on function creer_administrateur(text, text, text, text) from public, anon, authenticated;
