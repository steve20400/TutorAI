-- Montrer aussi les demandes qui viennent de se fermer.
--
-- La fonction ne rendait que les demandes vivantes : passé dix minutes, la
-- carte disparaissait de l'écran du parent. Un élément qui s'efface fait
-- croire à une erreur d'affichage — on recharge la page en boucle en se
-- demandant ce qu'on a mal fait.
--
-- Elle rend désormais aussi celles de la dernière heure, avec de quoi savoir
-- si elles sont closes. La carte reste, sa zone de saisie se verrouille, et
-- la raison s'écrit à côté : c'est fini, et pourquoi.
-- Le type de retour change : Postgres exige qu'on la retire d'abord.
drop function if exists demandes_de_mot_de_passe();
create function demandes_de_mot_de_passe()
returns table (
  id uuid,
  eleve_id uuid,
  prenom text,
  nom text,
  expire_le timestamptz,
  fermee boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.eleve_id, p.prenom, p.nom, d.expire_le,
         (d.utilise_le is not null or d.expire_le <= now())
    from demandes_mot_de_passe d
    join profils p on p.id = d.eleve_id
   where est_mon_enfant(d.eleve_id)
     and d.cree_le > now() - interval '1 hour'
   order by d.cree_le desc;
$$;

grant execute on function demandes_de_mot_de_passe() to authenticated;
