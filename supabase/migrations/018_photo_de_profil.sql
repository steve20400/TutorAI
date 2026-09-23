-- Une photo de profil pour tout le monde, pas seulement les répétiteurs.
--
-- `photo_url` n'existait que sur `repetiteurs`, parce que l'annuaire en avait
-- besoin. Mais un parent, un élève et l'administration ont un profil eux
-- aussi, et l'écran des familles affiche des initiales faute de mieux.
--
-- La colonne vit sur `profils` et non sur chaque table de rôle : c'est la
-- table que tout le monde possède, et la dupliquer obligerait à choisir
-- laquelle lire selon qui l'on regarde.
--
-- Elle porte une URL et non l'image : les fichiers vivent dans le stockage
-- Supabase, une base de données n'est pas un disque. Rien n'est téléversé
-- pour l'instant — la colonne attend, et l'avatar retombe sur les initiales
-- tant qu'elle est vide.
alter table profils add column if not exists photo_url text;

-- Celle du répétiteur reste en place : elle est déjà lue par l'annuaire, et
-- la déplacer demanderait de reprendre les politiques de `repetiteurs` pour
-- une raison d'organisation, pas de besoin.
