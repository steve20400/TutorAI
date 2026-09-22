-- =============================================================================
-- Migration 002 — nombre maximal de participants à une séance
--
-- Deux par défaut : l'élève et son répétiteur. C'est la promesse du produit,
-- et elle doit être le comportement par défaut, pas une option à cocher.
--
-- Réglable depuis l'espace d'administration, parce qu'un répétiteur finira par
-- demander à prendre deux enfants d'une même famille en même temps — et qu'il
-- ne faudra pas redéployer pour le lui accorder.
--
-- Le contrôle vit côté serveur au moment de délivrer le jeton d'accès à la
-- salle : refuser un troisième participant dans l'interface n'empêcherait
-- personne d'appeler la route derrière.
-- =============================================================================

insert into parametres (cle, valeur, libelle) values
  ('participants_max', '2'::jsonb,
   'Participants maximum par séance — deux par défaut : l''élève et son répétiteur')
on conflict (cle) do nothing;
