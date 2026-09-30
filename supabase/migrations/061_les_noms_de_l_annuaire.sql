-- L'annuaire affichait des fiches sans nom.
--
-- La table `repetiteurs` porte la bio, la ville, les matières, le tarif — et
-- une politique qui laisse les familles voir les répétiteurs vérifiés. Mais le
-- nom d'une personne vit dans `profils`, dont la politique de lecture
-- n'autorise que son propre profil, ses enfants et l'administration. Un parent
-- pouvait donc lire toute la fiche d'un répétiteur sauf la seule chose qui
-- permette de l'appeler par son nom.
--
-- C'est le même mur que pour `mes_adultes()` (migration 057), et il se franchit
-- de la même façon : une fonction qui rend exactement ce que l'annuaire
-- affiche, plutôt qu'une politique qui ouvrirait la ligne entière — téléphone,
-- identifiant de connexion, pays.
--
-- Elle ne rend un nom que pour un répétiteur VÉRIFIÉ. Sans cette condition,
-- elle dirait qui a déposé un dossier, y compris ceux que l'administration a
-- refusés ou n'a pas encore regardés.

begin;

create or replace function noms_de_repetiteurs(ids uuid[])
returns table (id uuid, prenom text, nom text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.prenom, p.nom
    from profils p
    join repetiteurs r on r.id = p.id
   where p.id = any(ids)
     and r.statut = 'verifie';
$$;

comment on function noms_de_repetiteurs(uuid[]) is
  'Le prénom et le nom des répétiteurs vérifiés, pour l''annuaire. Rien '
  'd''autre : ni téléphone, ni identifiant, ni adresse.';

revoke all on function noms_de_repetiteurs(uuid[]) from public;
grant execute on function noms_de_repetiteurs(uuid[]) to anon, authenticated;

commit;
