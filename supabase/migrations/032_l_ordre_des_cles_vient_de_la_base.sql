-- L'ordre d'affichage des clés appartient à la base.
--
-- Il était écrit deux fois dans le code : une liste pour l'affichage, une
-- autre pour autoriser l'écriture. Les deux ont divergé au moment d'ajouter
-- Gemini, et l'action est ressortie EN SILENCE — la carte s'affichait, le
-- bouton répondait, le champ se vidait, et rien n'était écrit.
--
-- `poser_cle` savait déjà refuser un nom inconnu : la liste du code ne
-- protégeait de rien, elle empêchait seulement la base de parler.
--
-- Une colonne suffit. Ajouter une clé, c'est maintenant insérer une ligne.
alter table cles_api add column if not exists ordre smallint not null default 100;

update cles_api set ordre = case nom
  when 'contact_administration' then 10
  when 'carte_style'            then 20
  when 'carte_cle'              then 30
  when 'anthropic'              then 40
  when 'gemini'                 then 50
  when 'ia_compatible'          then 60
  when 'ia_compatible_url'      then 70
  when 'orange'                 then 80
  when 'mtn'                    then 90
  else 100
end;

-- `order by nom` mettait « anthropic » avant « carte_style » : un classement
-- alphabétique n'a aucun rapport avec ce que l'administration cherche.
-- Le type de retour change : Postgres exige qu'on la retire d'abord.
drop function if exists lister_cles();
create function lister_cles()
returns table (nom text, publique boolean, apercu text, maj_le timestamptz, ordre smallint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not est_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;

  return query
    select c.nom, c.publique, c.apercu, c.maj_le, c.ordre
    from cles_api c
    order by c.ordre, c.nom;
end; $$;
