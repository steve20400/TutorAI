-- L'enfant ne voyait pas ses adultes, et ce n'était pas l'écran.
--
-- La politique de lecture de `profils` autorise : son propre profil, ses
-- enfants, ses enfants provisoires, l'administration. Rien dans l'autre sens.
-- Un enfant pouvait donc lire ses liens — « lire ses liens » l'y autorise —
-- mais pas le prénom de l'adulte au bout du lien. La route rendait une liste
-- vide, et l'écran affichait « aucun adulte » alors qu'il y en avait un.
--
-- Le même silence cassait le choix du payeur dans la jauge : il ne s'affiche
-- qu'à partir de deux adultes, et il n'en voyait jamais aucun.
--
-- On n'élargit pas la politique. Elle donnerait la ligne entière — téléphone,
-- identifiant de connexion, pays — alors que tout le reste du produit répète
-- qu'un écran d'enfant ne doit pas devenir un moyen d'apprendre comment
-- joindre un adulte hors d'ici. Une fonction rend exactement les quatre
-- choses nécessaires, et rien de plus.

begin;

create or replace function mes_adultes()
returns table (
  id uuid,
  prenom text,
  photo_url text,
  porte boolean,
  fournit boolean,
  provisoire boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.prenom, p.photo_url,
         l.porte, l.fournit, (l.actif_le > now())
    from liens_familiaux l
    join profils p on p.id = l.parent_id
   where l.eleve_id = auth.uid()
   order by l.porte desc, p.prenom;
$$;

comment on function mes_adultes() is
  'Les adultes rattachés à l''enfant connecté. Un prénom, une image, qui '
  'porte et qui fournit — ni téléphone, ni identifiant, ni adresse.';

revoke all on function mes_adultes() from public, anon;
grant execute on function mes_adultes() to authenticated;

commit;
