-- Un laissez-passer qui ne sait ouvrir qu'une porte.
--
-- Le backend doit lire la clé du fournisseur d'IA. Cette clé vit dans
-- `cles_api`, que seule l'administration peut lire — et c'est bien ainsi.
--
-- Trois façons de résoudre ça, deux mauvaises :
--
--   — mettre la clé dans l'environnement du serveur : le backend ne gagne
--     aucun pouvoir, mais Steve devrait retourner sur le serveur chaque fois
--     qu'il change de fournisseur ;
--   — donner au backend un jeton de service : il pourrait alors TOUT lire,
--     enregistrements de séances compris, et une faille dans le service
--     deviendrait une faille dans la vie des enfants.
--
-- La troisième est celle-ci. Un rôle Postgres dont le seul droit au monde est
-- d'exécuter une fonction qui renvoie la configuration du tuteur. Pas de
-- lecture de table, pas d'écriture, aucun accès au reste.
--
-- Ce qui compte : si ce mot de passe fuit, l'attaquant obtient la clé de
-- l'IA — exactement ce qu'il aurait obtenu si la clé était dans
-- l'environnement. Rien de plus. Le secret détenu par le service est donc
-- aussi puissant que ce qu'il protège, et pas davantage.

-- ── Ce que le service a le droit de demander ────────────────────────────────
create or replace function cle_du_fournisseur()
returns table (
  fournisseur    text,
  modele_essai   text,
  modele_compte  text,
  cle            text,
  url            text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select valeur #>> '{}' from parametres where cle = 'ia_fournisseur'), 'anthropic'),
    coalesce((select valeur #>> '{}' from parametres where cle = 'ia_modele_essai'), ''),
    coalesce((select valeur #>> '{}' from parametres where cle = 'ia_modele_compte'), ''),
    coalesce((select c.valeur from cles_api c
               where c.nom = case
                 when (select valeur #>> '{}' from parametres where cle = 'ia_fournisseur') = 'gemini'
                   then 'gemini'
                 when (select valeur #>> '{}' from parametres where cle = 'ia_fournisseur') = 'compatible'
                   then 'ia_compatible'
                 else 'anthropic' end), ''),
    coalesce((select c.valeur from cles_api c where c.nom = 'ia_compatible_url'), '');
$$;

-- ── Le rôle ─────────────────────────────────────────────────────────────────
-- Sans mot de passe ici : ce fichier est versionné, et un secret dans un
-- dépôt est un secret perdu. Il se pose à la main, une seule fois.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'service_ia') then
    create role service_ia login noinherit;
  end if;
end $$;

-- Il entre dans le schéma, et c'est tout ce qu'il peut y faire.
grant usage on schema public to service_ia;

-- Personne d'autre n'exécute cette fonction. Surtout pas `anon` : un visiteur
-- anonyme qui pourrait l'appeler repartirait avec la clé.
revoke all on function cle_du_fournisseur() from public;
revoke all on function cle_du_fournisseur() from anon;
revoke all on function cle_du_fournisseur() from authenticated;
grant execute on function cle_du_fournisseur() to service_ia;

-- Aucune table, aucune séquence, aucune autre fonction. On le dit
-- explicitement plutôt que de compter sur les réglages par défaut.
revoke all on all tables    in schema public from service_ia;
revoke all on all sequences in schema public from service_ia;
revoke all on all functions in schema public from service_ia;
grant execute on function cle_du_fournisseur() to service_ia;
