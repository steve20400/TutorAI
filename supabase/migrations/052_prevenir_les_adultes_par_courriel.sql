-- L'enfant demande son mot de passe : ses adultes l'apprennent aussi par courriel.
--
-- La moitié de cette promesse existait déjà. L'enfant donne son nom de
-- connexion, une demande s'inscrit, et les adultes rattachés la voient sur
-- l'accueil de leur espace. Mais l'écran disait à l'enfant « il vient d'être
-- prévenu — par mail et dans son espace », et le courriel n'a jamais été
-- écrit. Un enfant dont le parent n'ouvre pas l'application attendait un
-- message qui ne partait pas.
--
-- Le courriel ne porte aucun lien d'action, et c'est un choix. Un lien qui
-- ouvrirait directement l'écran serait un jeton de plus à fabriquer, à faire
-- expirer, à ne servir qu'une fois — et quiconque lit la boîte d'un parent
-- prendrait le compte de son enfant. L'alerte dit ce qui se passe ; le parent
-- se connecte comme d'habitude et traite la demande depuis la carte qui
-- existe déjà.

begin;

-- ── 1. De quoi écrire ───────────────────────────────────────────────────────
-- Dans `cles_api` comme le reste : réglable depuis l'espace d'administration,
-- sans redéploiement. Changer de fournisseur d'envoi un dimanche soir ne doit
-- pas demander un accès à Render.

insert into cles_api (nom, publique, ordre) values
  ('courrier_cle',            false, 91),
  ('courrier_expediteur',     false, 92),
  ('courrier_expediteur_nom', false, 93)
on conflict (nom) do nothing;

-- L'expéditeur a une valeur de départ : sans elle, le premier envoi échouerait
-- sur une adresse vide, et l'erreur parlerait de syntaxe plutôt que de
-- réglage manquant.
update cles_api set valeur = 'TUTELA'
 where nom = 'courrier_expediteur_nom' and valeur is null;

create or replace function cle_du_courrier()
returns table (cle text, expediteur text, expediteur_nom text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select valeur from cles_api where nom = 'courrier_cle'),
    (select valeur from cles_api where nom = 'courrier_expediteur'),
    coalesce((select valeur from cles_api where nom = 'courrier_expediteur_nom'), 'TUTELA');
$$;

revoke all on function cle_du_courrier() from public, anon, authenticated;
grant execute on function cle_du_courrier() to service_ia;

-- ── 2. À qui écrire ─────────────────────────────────────────────────────────
-- Cette fonction rend des adresses de courriel. Elle est donc fermée à tout
-- le monde sauf au service, et elle ne répond que s'il existe une demande
-- vivante et fraîche : sans cette condition, elle deviendrait un moyen de
-- savoir, nom par nom, quels enfants sont inscrits et avec quels parents.
--
-- Deux minutes, parce qu'elle n'est appelée que dans la seconde qui suit la
-- demande. Tout ce qui arrive plus tard n'est pas notre service.

create or replace function destinataires_a_prevenir(nom_enfant text)
returns table (courriel text, prenom_enfant text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select distinct u.email::text, e.prenom
    from profils e
    join demandes_mot_de_passe d
      on d.eleve_id = e.id
     and d.utilise_le is null
     and d.expire_le > now()
     and d.cree_le > now() - interval '2 minutes'
    join liens_familiaux l
      on l.eleve_id = e.id
     and l.actif_le <= now()
    join auth.users u
      on u.id = l.parent_id
   where lower(e.identifiant) = normaliser_identifiant(nom_enfant)
     and e.role = 'eleve'
     and u.email is not null;
$$;

revoke all on function destinataires_a_prevenir(text) from public, anon, authenticated;
grant execute on function destinataires_a_prevenir(text) to service_ia;

commit;
