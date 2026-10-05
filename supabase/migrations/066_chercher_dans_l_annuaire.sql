-- La recherche de la barre d'application.
--
-- Le canevas met un champ « Un nom, une matière… » dans l'en-tête de chaque
-- écran. Il ne pouvait rien chercher : les filtres de l'annuaire portent sur
-- des colonnes de `repetiteurs`, et le NOM vit dans `profils`, qu'un parent
-- n'a pas le droit de lire.
--
-- Une fonction donc, qui ne rend que des identifiants — la route s'en sert
-- pour restreindre la liste qu'elle sait déjà construire. Elle ne rend rien
-- d'autre : chercher ne doit pas devenir un moyen d'obtenir des fiches qu'on
-- n'aurait pas le droit de lister.
--
-- Les répétiteurs non vérifiés n'y sont pas. Sans cette condition, taper un
-- nom au hasard dirait qui a déposé un dossier.

begin;

create or replace function chercher_repetiteurs(q text)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select r.id
    from repetiteurs r
    join profils p on p.id = r.id
   where r.statut = 'verifie'
     and btrim(coalesce(q, '')) <> ''
     and (
       p.prenom ilike '%' || btrim(q) || '%'
       or p.nom   ilike '%' || btrim(q) || '%'
       or r.ville ilike '%' || btrim(q) || '%'
       or r.bio   ilike '%' || btrim(q) || '%'
       or exists (
         select 1 from unnest(r.matieres) m where m ilike '%' || btrim(q) || '%'
       )
     );
$$;

revoke all on function chercher_repetiteurs(text) from public;
grant execute on function chercher_repetiteurs(text) to anon, authenticated;

-- ── Les effectifs par ville ────────────────────────────────────────────────
-- La barre de filtres du canevas affiche « Yaoundé 8, Douala 9 ». Sans ce
-- compte, il faudrait charger tout l'annuaire pour le calculer, ou l'inventer.
create or replace function repetiteurs_par_ville()
returns table (ville text, n integer)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(r.ville, '') as ville, count(*)::int
    from repetiteurs r
   where r.statut = 'verifie'
     and r.ville is not null
     and btrim(r.ville) <> ''
   group by 1
   order by 2 desc, 1;
$$;

revoke all on function repetiteurs_par_ville() from public;
grant execute on function repetiteurs_par_ville() to anon, authenticated;

-- ── Les bornes de la glissière ─────────────────────────────────────────────
-- Le tarif le plus bas et le plus haut de l'annuaire. Sans eux, il faudrait
-- fixer « de 0 à 100 000 F » dans l'écran — un chiffre inventé, qui vieillirait
-- mal et qui rendrait la glissière inutile si tout le monde est entre 22 et 35.
create or replace function bornes_tarifs()
returns table (bas integer, haut integer)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(min(tarif_mensuel), 0)::int,
         coalesce(max(tarif_mensuel), 0)::int
    from repetiteurs
   where statut = 'verifie' and tarif_mensuel is not null;
$$;

revoke all on function bornes_tarifs() from public;
grant execute on function bornes_tarifs() to anon, authenticated;

commit;
