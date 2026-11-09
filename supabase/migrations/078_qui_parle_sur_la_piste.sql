-- Qui parle, sur la piste qu'on écoute.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI UNE FONCTION POUR DEUX PRÉNOMS
--
-- La relecture d'une séance joue une piste par personne — on ne mélange pas,
-- parce que deux voix superposées ne s'attribuent plus, et que c'est
-- précisément le passage qu'on viendrait écouter.
--
-- Mais une piste intitulée « 1b9bcf56-a48d-41ec… » ne dit rien. Et c'est un
-- parent qui vient écouter, pas un ingénieur.
--
-- Or la politique de lecture de `profils` ne laisse pas un parent lire le
-- profil du répétiteur, ni un répétiteur celui de l'élève. Élargir cette
-- politique pour deux prénoms donnerait la ligne entière : téléphone,
-- identifiant de connexion, adresse. C'est exactement le genre d'élargissement
-- qui ouvre une porte qu'on croyait fermer d'un côté seulement.
--
-- On rend donc l'identifiant et le PRÉNOM, pour les deux personnes qui
-- étaient dans la salle, et rien d'autre. Pas le nom de famille : il ne sert
-- pas à savoir qui parle sur un enregistrement qu'on a soi-même demandé.
--
-- ─────────────────────────────────────────────────────────────────────────
-- QUI PEUT DEMANDER
--
-- Exactement ceux qui peuvent déjà relire la séance : `ma_seance` couvre les
-- deux parties et l'adulte du contrat, `est_admin` couvre l'administration.
-- La règle est appelée, pas recopiée — une copie finirait par diverger, et
-- c'est la copie oubliée qui ouvre ce qui devait rester fermé.

begin;

create or replace function noms_de_la_seance(cible uuid)
returns table (id uuid, prenom text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.prenom
    from seances_humaines s
    join contrats c on c.id = s.contrat_id
    join profils p on p.id in (c.repetiteur_id, c.eleve_id)
   where s.id = cible
     and (ma_seance(cible) or est_admin());
$$;

revoke all on function noms_de_la_seance(uuid) from public, anon;
grant execute on function noms_de_la_seance(uuid) to authenticated;

commit;
