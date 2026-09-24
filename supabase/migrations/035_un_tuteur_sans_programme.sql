-- Un tuteur peut exister sans programme officiel.
--
-- Jusqu'ici `programme_id` était obligatoire, et c'était un choix assumé :
-- l'ancrage curriculaire est le produit, sans lui il ne reste qu'un assistant
-- générique de plus.
--
-- Sauf qu'en pratique un seul programme est chargé — Terminale D
-- mathématiques, et ivoirien de surcroît. Un élève de cinquième qui veut
-- réviser son anglais se heurtait à une porte fermée, sans même comprendre
-- pourquoi. On ne recensera jamais tous les programmes de tous les pays avant
-- d'ouvrir.
--
-- Donc : le programme reste la bonne façon, et la matière libre devient la
-- porte de secours. L'élève sait laquelle il emprunte — l'écran le dit, et le
-- tuteur le dit aussi en ouvrant la séance.
alter table tuteurs_ia alter column programme_id drop not null;

comment on column tuteurs_ia.programme_id is
  'Le programme officiel suivi. Nul quand l''élève a nommé sa matière '
  'lui-même : le tuteur travaille alors sans table des matières, et le dit.';

-- Les matières que les élèves écrivent eux-mêmes entrent dans la table, pour
-- être proposées au suivant. C'est la demande qui dit à l'administration quels
-- programmes charger ensuite.
alter table matieres add column if not exists proposee_par_un_eleve boolean not null default false;

comment on column matieres.proposee_par_un_eleve is
  'Vraie quand la matière vient d''un élève et non du catalogue de départ. '
  'Ce que les élèves réclament indique quel programme charger ensuite.';

-- Un élève peut créer une matière, jamais en modifier ni en supprimer une.
drop policy if exists "un eleve propose une matiere" on matieres;
create policy "un eleve propose une matiere" on matieres
  for insert to authenticated
  with check (proposee_par_un_eleve and active);
