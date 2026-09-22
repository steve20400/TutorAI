-- Un enfant n'a pas d'adresse mail. Sa famille en a une, parfois.
--
-- Supabase impose une adresse unique par compte (`users_email_partial_key`).
-- Dans une maison où l'on partage un téléphone et une boîte mail — la règle
-- plutôt que l'exception ici — le premier qui s'inscrit prend l'adresse, et
-- les autres sont dehors. Un enfant inscrit le matin empêchait sa mère de
-- chercher un répétiteur le soir.
--
-- La colonne `email` étant nullable et `profils.identifiant` déjà unique, un
-- compte peut vivre sans adresse et se connecter par identifiant. C'est déjà
-- ce que fait l'administration : `email_par_identifiant()` existe, elle ne
-- servait qu'à GALILEE.
--
-- L'adresse posée ici (`eleve-XXXX@eleves.tutela.cm`) n'est jamais montrée ni
-- utilisée pour écrire : elle n'existe que parce que GoTrue refuse un compte
-- sans identifiant de connexion. Le domaine n'a volontairement aucun MX — rien
-- ne doit pouvoir y être envoyé.
--
-- Effet de bord voulu, et c'est le plus important : un mineur ne peut plus
-- ouvrir un compte seul. Il naît rattaché à un adulte identifié. Jusqu'ici un
-- enfant pouvait s'inscrire et chercher un répétiteur sans qu'aucun parent ne
-- le sache — exactement la situation que cette plateforme existe pour rendre
-- impossible.

/** Fabrique un identifiant lisible et unique : JUNIOR-NGASSA, puis -2, -3… */
create or replace function identifiant_eleve(prenom text, nom text)
returns text language plpgsql security definer set search_path = public as $$
declare
  nu text;
  base text;
  essai text;
  n int := 1;
begin
  nu := upper(unaccent_simple(coalesce(prenom, '') || '-' || coalesce(nom, '')));
  base := regexp_replace(nu, '[^A-Z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then base := 'ELEVE'; end if;
  base := left(base, 28);

  essai := base;
  while exists (select 1 from profils where identifiant = essai) loop
    n := n + 1;
    essai := base || '-' || n;
  end loop;
  return essai;
end; $$;

/** Retire les accents sans dépendre de l'extension `unaccent`. */
create or replace function unaccent_simple(texte text)
returns text language sql immutable as $$
  select translate(
    texte,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

/**
 * Crée le compte d'un enfant, rattaché à celui qui appelle.
 *
 * Seul un parent peut l'appeler, et l'enfant est lié à LUI : on ne passe pas
 * le parent en paramètre, sinon un parent pourrait rattacher un enfant au
 * compte d'un autre.
 */
-- `search_path` inclut `extensions` : pgcrypto y vit chez Supabase, et un
-- chemin limité à `public` fait échouer `crypt`/`gen_salt` avec « function
-- does not exist ». Le laisser ouvert serait pire — une fonction `security
-- definer` au chemin libre peut être détournée en plaçant une fonction de même
-- nom dans un schéma qui précède.
create or replace function creer_compte_eleve(
  prenom_eleve text,
  nom_eleve text,
  mot_de_passe text
) returns table (id uuid, identifiant text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  parent uuid := auth.uid();
  nouvel_id uuid := gen_random_uuid();
  ident text;
  courriel text;
begin
  if parent is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if not exists (select 1 from profils where profils.id = parent and role = 'parent') then
    raise exception 'Seul un parent rattache un enfant à son compte'
      using errcode = '42501';
  end if;

  if length(coalesce(trim(prenom_eleve), '')) < 2 then
    raise exception 'Le prénom de l''enfant est obligatoire';
  end if;

  -- Court, parce qu'un enfant doit pouvoir le taper seul ; mais pas vide.
  if length(coalesce(mot_de_passe, '')) < 6 then
    raise exception 'Le mot de passe doit faire au moins 6 caractères';
  end if;

  ident := identifiant_eleve(prenom_eleve, nom_eleve);
  courriel := 'eleve-' || replace(nouvel_id::text, '-', '') || '@eleves.tutela.cm';

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
    jsonb_build_object('role', 'eleve', 'prenom', trim(prenom_eleve),
                       'nom', nullif(trim(coalesce(nom_eleve, '')), ''),
                       'identifiant', ident),
    now(), now(), '', '', '', '', '', '', '', '');

  insert into auth.identities
    (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (nouvel_id::text, nouvel_id,
    jsonb_build_object('sub', nouvel_id::text, 'email', courriel,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  -- Le déclencheur d'inscription a posé le profil ; l'identifiant vient d'ici.
  update profils set identifiant = ident where profils.id = nouvel_id;

  insert into liens_familiaux (parent_id, eleve_id) values (parent, nouvel_id);

  return query select nouvel_id, ident;
end; $$;

revoke all on function creer_compte_eleve(text, text, text) from public, anon;
