-- Les villes passent de la carte dessinée à la vraie carte.
--
-- `x` et `y` repéraient une position sur un fond stylisé de 300 × 230. Avec un
-- fond de carte réel, il faut des coordonnées terrestres — et elles valent
-- mieux : elles restent justes si le fond change de fournisseur, de projection
-- ou de niveau de zoom, ce qu'un repère dessiné ne fait pas.
--
-- `x` et `y` sont conservés : ils ne coûtent rien et un repli sans réseau
-- pourrait les réutiliser.
alter table villes add column if not exists lon double precision;
alter table villes add column if not exists lat double precision;

update villes set lon = v.lon, lat = v.lat from (values
  ('Maroua',     14.3159, 10.5910),
  ('Garoua',     13.3958,  9.3017),
  ('Ngaoundéré', 13.5847,  7.3167),
  ('Bamenda',    10.1591,  5.9631),
  ('Bafoussam',  10.4178,  5.4781),
  ('Bertoua',    13.6846,  4.5775),
  ('Yaoundé',    11.5021,  3.8480),
  ('Douala',      9.7043,  4.0511),
  ('Buea',        9.2410,  4.1527),
  ('Kribi',       9.9100,  2.9400),
  ('Ebolowa',    11.1500,  2.9000)
) as v(nom, lon, lat) where villes.nom = v.nom;
