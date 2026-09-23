-- Cinquante avatars pour les élèves.
--
-- Dessinés et non téléchargés : une image trouvée ailleurs vient avec sa
-- licence, son poids et ce qu'elle représente. Ici, dix motifs croisés avec
-- cinq palettes donnent cinquante choix dont on sait exactement ce qu'ils
-- contiennent — c'est-à-dire des formes, et rien qui ressemble à quelqu'un.
--
-- Aucun œil, aucun triangle isolé, aucun compas, aucun soleil à rayons : ces
-- signes évoquent les sectes au Cameroun, et un enfant ne doit pas avoir à
-- expliquer chez lui pourquoi son compte en porte un.
--
-- En base plutôt que dans le code : en ajouter un ne demandera pas un
-- déploiement. Chacun pèse deux cents octets, la table entière tient dans une
-- seule réponse.
create table if not exists avatars (
  cle text primary key,
  motif text not null,
  fond text not null,
  trait text not null,
  -- Tracé dans un carré de 48 × 48, sans remplissage.
  forme text not null,
  ordre smallint not null,
  visible boolean not null default true
);

insert into avatars (cle, motif, fond, trait, forme, ordre) values
  ('01', 'cercles', '#d9c9a8', '#5b4a2f', 'M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0', 1),
  ('02', 'vague', '#d9c9a8', '#5b4a2f', 'M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0', 2),
  ('03', 'colline', '#d9c9a8', '#5b4a2f', 'M13 33c4-12 8-16 11-16s7 4 11 16', 3),
  ('04', 'damier', '#d9c9a8', '#5b4a2f', 'M15 15h8v8h-8zM25 25h8v8h-8zM25 15h8v8h-8z', 4),
  ('05', 'goutte', '#d9c9a8', '#5b4a2f', 'M24 13c6 8 9 12 9 15a9 9 0 0 1-18 0c0-3 3-7 9-15z', 5),
  ('06', 'arches', '#d9c9a8', '#5b4a2f', 'M13 32a11 11 0 0 1 22 0M18 32a6 6 0 0 1 12 0', 6),
  ('07', 'barres', '#d9c9a8', '#5b4a2f', 'M16 16v16M24 13v22M32 18v12', 7),
  ('08', 'feuille', '#d9c9a8', '#5b4a2f', 'M16 32c0-10 8-16 16-16 0 10-8 16-16 16zM16 32L32 16', 8),
  ('09', 'anneaux', '#d9c9a8', '#5b4a2f', 'M19 24a7 7 0 1 0 .01 0M29 24a7 7 0 1 0 .01 0', 9),
  ('10', 'escalier', '#d9c9a8', '#5b4a2f', 'M14 33h7v-7h7v-7h7', 10),
  ('11', 'cercles', '#c6d6c9', '#2c4a37', 'M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0', 11),
  ('12', 'vague', '#c6d6c9', '#2c4a37', 'M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0', 12),
  ('13', 'colline', '#c6d6c9', '#2c4a37', 'M13 33c4-12 8-16 11-16s7 4 11 16', 13),
  ('14', 'damier', '#c6d6c9', '#2c4a37', 'M15 15h8v8h-8zM25 25h8v8h-8zM25 15h8v8h-8z', 14),
  ('15', 'goutte', '#c6d6c9', '#2c4a37', 'M24 13c6 8 9 12 9 15a9 9 0 0 1-18 0c0-3 3-7 9-15z', 15),
  ('16', 'arches', '#c6d6c9', '#2c4a37', 'M13 32a11 11 0 0 1 22 0M18 32a6 6 0 0 1 12 0', 16),
  ('17', 'barres', '#c6d6c9', '#2c4a37', 'M16 16v16M24 13v22M32 18v12', 17),
  ('18', 'feuille', '#c6d6c9', '#2c4a37', 'M16 32c0-10 8-16 16-16 0 10-8 16-16 16zM16 32L32 16', 18),
  ('19', 'anneaux', '#c6d6c9', '#2c4a37', 'M19 24a7 7 0 1 0 .01 0M29 24a7 7 0 1 0 .01 0', 19),
  ('20', 'escalier', '#c6d6c9', '#2c4a37', 'M14 33h7v-7h7v-7h7', 20),
  ('21', 'cercles', '#cfd3e2', '#2f3a5b', 'M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0', 21),
  ('22', 'vague', '#cfd3e2', '#2f3a5b', 'M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0', 22),
  ('23', 'colline', '#cfd3e2', '#2f3a5b', 'M13 33c4-12 8-16 11-16s7 4 11 16', 23),
  ('24', 'damier', '#cfd3e2', '#2f3a5b', 'M15 15h8v8h-8zM25 25h8v8h-8zM25 15h8v8h-8z', 24),
  ('25', 'goutte', '#cfd3e2', '#2f3a5b', 'M24 13c6 8 9 12 9 15a9 9 0 0 1-18 0c0-3 3-7 9-15z', 25),
  ('26', 'arches', '#cfd3e2', '#2f3a5b', 'M13 32a11 11 0 0 1 22 0M18 32a6 6 0 0 1 12 0', 26),
  ('27', 'barres', '#cfd3e2', '#2f3a5b', 'M16 16v16M24 13v22M32 18v12', 27),
  ('28', 'feuille', '#cfd3e2', '#2f3a5b', 'M16 32c0-10 8-16 16-16 0 10-8 16-16 16zM16 32L32 16', 28),
  ('29', 'anneaux', '#cfd3e2', '#2f3a5b', 'M19 24a7 7 0 1 0 .01 0M29 24a7 7 0 1 0 .01 0', 29),
  ('30', 'escalier', '#cfd3e2', '#2f3a5b', 'M14 33h7v-7h7v-7h7', 30),
  ('31', 'cercles', '#e0cdc4', '#6b3f2f', 'M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0', 31),
  ('32', 'vague', '#e0cdc4', '#6b3f2f', 'M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0', 32),
  ('33', 'colline', '#e0cdc4', '#6b3f2f', 'M13 33c4-12 8-16 11-16s7 4 11 16', 33),
  ('34', 'damier', '#e0cdc4', '#6b3f2f', 'M15 15h8v8h-8zM25 25h8v8h-8zM25 15h8v8h-8z', 34),
  ('35', 'goutte', '#e0cdc4', '#6b3f2f', 'M24 13c6 8 9 12 9 15a9 9 0 0 1-18 0c0-3 3-7 9-15z', 35),
  ('36', 'arches', '#e0cdc4', '#6b3f2f', 'M13 32a11 11 0 0 1 22 0M18 32a6 6 0 0 1 12 0', 36),
  ('37', 'barres', '#e0cdc4', '#6b3f2f', 'M16 16v16M24 13v22M32 18v12', 37),
  ('38', 'feuille', '#e0cdc4', '#6b3f2f', 'M16 32c0-10 8-16 16-16 0 10-8 16-16 16zM16 32L32 16', 38),
  ('39', 'anneaux', '#e0cdc4', '#6b3f2f', 'M19 24a7 7 0 1 0 .01 0M29 24a7 7 0 1 0 .01 0', 39),
  ('40', 'escalier', '#e0cdc4', '#6b3f2f', 'M14 33h7v-7h7v-7h7', 40),
  ('41', 'cercles', '#cddbe0', '#2b4753', 'M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0', 41),
  ('42', 'vague', '#cddbe0', '#2b4753', 'M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0', 42),
  ('43', 'colline', '#cddbe0', '#2b4753', 'M13 33c4-12 8-16 11-16s7 4 11 16', 43),
  ('44', 'damier', '#cddbe0', '#2b4753', 'M15 15h8v8h-8zM25 25h8v8h-8zM25 15h8v8h-8z', 44),
  ('45', 'goutte', '#cddbe0', '#2b4753', 'M24 13c6 8 9 12 9 15a9 9 0 0 1-18 0c0-3 3-7 9-15z', 45),
  ('46', 'arches', '#cddbe0', '#2b4753', 'M13 32a11 11 0 0 1 22 0M18 32a6 6 0 0 1 12 0', 46),
  ('47', 'barres', '#cddbe0', '#2b4753', 'M16 16v16M24 13v22M32 18v12', 47),
  ('48', 'feuille', '#cddbe0', '#2b4753', 'M16 32c0-10 8-16 16-16 0 10-8 16-16 16zM16 32L32 16', 48),
  ('49', 'anneaux', '#cddbe0', '#2b4753', 'M19 24a7 7 0 1 0 .01 0M29 24a7 7 0 1 0 .01 0', 49),
  ('50', 'escalier', '#cddbe0', '#2b4753', 'M14 33h7v-7h7v-7h7', 50)
on conflict (cle) do nothing;

alter table avatars enable row level security;

-- Lisibles par tous : ce sont des dessins, et un élève doit pouvoir choisir
-- avant même d'avoir fini son inscription.
drop policy if exists "tout le monde voit les avatars" on avatars;
create policy "tout le monde voit les avatars" on avatars
  for select using (visible);

drop policy if exists "l'administration gere les avatars" on avatars;
create policy "l'administration gere les avatars" on avatars
  for all using (est_admin()) with check (est_admin());
