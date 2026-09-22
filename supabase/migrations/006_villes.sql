-- Les villes suivies par l'administration.
--
-- Elles étaient sur le point d'être écrites en dur dans le composant de la
-- carte. Une liste dans le code est une liste que l'administration ne peut pas
-- corriger : le jour où la plateforme ouvre à Limbe, il faudrait un
-- déploiement pour que Limbe apparaisse. Et une carte qui affiche des villes
-- absentes de la base ment sur ce que la base contient.
--
-- Les coordonnées sont celles de la carte stylisée du tableau de bord, un
-- repère de 300 × 230 dont l'océan occupe le bas à gauche. Ce n'est pas une
-- projection géographique : elle donne le pays de mémoire, ce qui suffit pour
-- répondre à la seule question qu'on lui pose — où manque-t-il quelqu'un.
create table if not exists villes (
  nom text primary key,
  x smallint not null,
  y smallint not null,
  -- Une ville peut être retirée de la carte sans perdre les fiches qui s'y
  -- rattachent : on la masque, on ne la supprime pas.
  visible boolean not null default true,
  cree_le timestamptz not null default now()
);

insert into villes (nom, x, y) values
  ('Maroua',     246,  24),
  ('Garoua',     222,  58),
  ('Ngaoundéré', 196,  98),
  ('Bamenda',     74, 118),
  ('Bafoussam',  100, 132),
  ('Bertoua',    206, 158),
  ('Yaoundé',    146, 162),
  ('Douala',      84, 162),
  ('Buea',        58, 180),
  ('Kribi',       96, 198),
  ('Ebolowa',    138, 202)
on conflict (nom) do nothing;

alter table villes enable row level security;

-- Tout le monde la lit : l'annuaire des parents s'en servira pour filtrer par
-- ville. Seule l'administration l'écrit.
drop policy if exists "lire les villes" on villes;
create policy "lire les villes" on villes
  for select using (true);

drop policy if exists "l'administration gere les villes" on villes;
create policy "l'administration gere les villes" on villes
  for all using (est_admin()) with check (est_admin());
