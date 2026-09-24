-- Un enfant qui arrive seul.
--
-- Il entend parler de TUTELA, il vient essayer le tuteur. Personne ne l'a
-- inscrit. Il n'a pas d'adresse électronique — et on ne lui en demande pas :
-- une adresse est un canal vers lui qui ne passe pas par la plateforme, et
-- tout le produit est bâti pour qu'aucun adulte n'ait de canal privé vers un
-- enfant.
--
-- Il entre donc avec un nom et un mot de passe, comme celui que son parent
-- aurait créé pour lui. La différence est qu'aucun adulte n'y est rattaché :
-- son compte est bridé — le tuteur IA, oui ; un répétiteur humain, non.

-- ── Le garde-fou ────────────────────────────────────────────────────────────
-- C'est le seul endroit de la plateforme où un visiteur anonyme écrit dans
-- `auth.users`. Sans compteur, une seule personne en fabrique des milliers
-- dans la nuit.
create table if not exists creations_anonymes (
  heure  timestamptz primary key,
  combien integer not null default 0
);

alter table creations_anonymes enable row level security;
-- Personne ne la lit ni ne l'écrit directement : seule la fonction ci-dessous
-- y touche, et elle contourne la RLS parce qu'elle est `security definer`.

comment on table creations_anonymes is
  'Comptes d''enfants créés sans compte adulte, par heure. Sert de plafond : '
  'c''est le seul endroit où un visiteur anonyme écrit dans auth.users.';

insert into parametres (cle, valeur, libelle) values
  ('inscriptions_enfant_par_heure', '30'::jsonb,
   'Comptes d''enfant créés sans adulte, au maximum par heure')
on conflict (cle) do nothing;

-- ── La création ─────────────────────────────────────────────────────────────
create or replace function creer_compte_enfant_seul(
  prenom_eleve text,
  nom_eleve text,
  mot_de_passe text
)
returns table (id uuid, identifiant text)
language plpgsql
security definer
-- `extensions` en plus de `public` : `crypt` et `gen_salt` viennent de
-- pgcrypto, qui vit là chez Supabase. Sans ce chemin, la fonction échoue à
-- l'insertion du mot de passe — et seulement là, donc après avoir déjà
-- incrémenté le compteur.
set search_path = public, extensions
as $$
declare
  nouvel_id uuid := gen_random_uuid();
  ident text;
  courriel text;
  cette_heure timestamptz := date_trunc('hour', now());
  plafond int;
  deja int;
begin
  if not coalesce((select (valeur #>> '{}')::boolean from parametres
                    where cle = 'inscriptions_ouvertes'), true) then
    raise exception 'Les inscriptions sont fermées pour le moment'
      using errcode = '42501';
  end if;

  if length(coalesce(trim(prenom_eleve), '')) < 2 then
    raise exception 'Écris ton prénom';
  end if;

  -- Court, parce qu'un enfant doit pouvoir le taper seul ; mais pas vide.
  if length(coalesce(mot_de_passe, '')) < 6 then
    raise exception 'Ton mot de passe doit faire au moins 6 caractères';
  end if;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'inscriptions_enfant_par_heure'), 30)
    into plafond;

  insert into creations_anonymes (heure, combien) values (cette_heure, 0)
  on conflict (heure) do nothing;

  -- `for update` sérialise : deux demandes simultanées ne peuvent pas lire le
  -- même compteur et passer toutes les deux.
  select combien into deja from creations_anonymes
   where heure = cette_heure for update;

  if deja >= plafond then
    raise exception 'Trop d''inscriptions en ce moment. Réessaie dans un moment.'
      using errcode = '53400';
  end if;

  update creations_anonymes set combien = combien + 1 where heure = cette_heure;

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

  update profils set identifiant = ident where profils.id = nouvel_id;

  -- Aucun `liens_familiaux` : c'est toute la différence. L'enfant est seul,
  -- et l'administration le verra comme tel.
  return query select nouvel_id, ident;
end; $$;

-- Appelable sans être connecté — c'est le propos — mais par cette fonction
-- seulement, qui compte et refuse.
revoke all on function creer_compte_enfant_seul(text, text, text) from public;
grant execute on function creer_compte_enfant_seul(text, text, text) to anon, authenticated;
