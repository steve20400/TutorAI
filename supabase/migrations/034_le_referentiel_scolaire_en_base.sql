-- Les matières et les niveaux appartiennent à la base.
--
-- Ils étaient écrits en dur DEUX fois — dans `BACKEND/routes/v1/repetiteur.ts`
-- pour la validation, dans `WEB/lib/referentiel.ts` pour l'affichage. Deux
-- listes qui disent la même chose finissent toujours par diverger, et le jour
-- où elles divergent personne ne le voit : c'est exactement ce qui vient
-- d'arriver aux clés, où l'ajout de Gemini d'un seul côté a fait disparaître
-- une clé en silence.
--
-- Et ce sont des données, pas du code. Le système scolaire camerounais bouge :
-- une matière s'ajoute, un intitulé change, un niveau se renomme. Rien de tout
-- cela ne devrait demander un déploiement.

create table if not exists matieres (
  nom    text primary key,
  ordre  smallint not null default 100,
  -- On ne supprime pas une matière : des fiches et des programmes la
  -- désignent. On l'éteint, et elle disparaît des listes sans emporter
  -- l'histoire de ceux qui l'enseignaient.
  active boolean not null default true
);

create table if not exists niveaux (
  nom    text primary key,
  ordre  smallint not null default 100,
  actif  boolean not null default true
);

insert into matieres (nom, ordre) values
  ('Mathématiques', 10), ('Physique-Chimie', 20), ('SVT', 30),
  ('Français', 40), ('Anglais', 50), ('Philosophie', 60),
  ('Histoire-Géographie', 70), ('Informatique', 80), ('Économie', 90)
on conflict (nom) do nothing;

insert into niveaux (nom, ordre) values
  ('6e', 10), ('5e', 20), ('4e', 30), ('3e', 40),
  ('2nde', 50), ('1ère', 60), ('Terminale', 70)
on conflict (nom) do nothing;

alter table matieres enable row level security;
alter table niveaux  enable row level security;

-- Tout le monde lit : l'annuaire filtre par matière avant même qu'on se
-- connecte, et un parent doit pouvoir chercher « Mathématiques » sans compte.
drop policy if exists "lire les matieres" on matieres;
create policy "lire les matieres" on matieres
  for select to anon, authenticated using (true);

drop policy if exists "lire les niveaux" on niveaux;
create policy "lire les niveaux" on niveaux
  for select to anon, authenticated using (true);

-- Seule l'administration ajoute ou retire.
drop policy if exists "l'administration tient les matieres" on matieres;
create policy "l'administration tient les matieres" on matieres
  for all to authenticated using (est_admin()) with check (est_admin());

drop policy if exists "l'administration tient les niveaux" on niveaux;
create policy "l'administration tient les niveaux" on niveaux
  for all to authenticated using (est_admin()) with check (est_admin());
