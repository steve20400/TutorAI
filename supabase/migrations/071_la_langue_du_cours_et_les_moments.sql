-- Deux filtres du canevas qui ne filtraient rien.
--
-- « Langue du cours » et « Disponibilité » figurent au dessin de l'annuaire.
-- Ils n'ont jamais été posés dans l'application, et c'était le bon choix sur
-- le moment : aucune colonne ne les portait. Le répétiteur écrit ses
-- disponibilités en texte libre — « mercredi après-midi, samedi matin » — et
-- la langue du cours n'existait nulle part. Un filtre sur du texte libre ne
-- filtre pas, il devine.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA LANGUE DU COURS N'EST PAS UN CONFORT
--
-- Le Cameroun a deux langues officielles, et le Nord-Ouest et le Sud-Ouest
-- travaillent en anglais. Un parent de Bamenda qui cherche un répétiteur de
-- mathématiques cherche quelqu'un qui enseigne EN ANGLAIS — sans quoi la
-- séance ne se tient pas. C'est la même raison qui fait que toute
-- l'application est traduite : une interface à moitié traduite laisse une
-- région devant des phrases qu'elle ne comprend pas.
--
-- Plusieurs valeurs par répétiteur : beaucoup enseignent dans les deux, et
-- devoir choisir en écarterait la moitié d'une recherche sur l'autre.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA DISPONIBILITÉ GARDE SON TEXTE, ET GAGNE UNE POIGNÉE DE CASES
--
-- Le texte libre dit mieux les choses : « je peux décaler une séance manquée
-- dans la même semaine » ne tient dans aucune case. Il reste, et c'est lui
-- qu'on lit sur le dossier.
--
-- À côté, quatre moments cochables, qui ne servent qu'à filtrer. Quatre et
-- pas quatorze : une famille ne cherche pas « mardi 17 h », elle cherche
-- « quelqu'un qui peut après l'école » ou « quelqu'un qui peut le week-end ».
-- Un découpage plus fin donnerait une grille que personne ne remplirait
-- honnêtement, et des filtres qui écartent à tort.
--
-- Les deux listes sont fermées et vérifiées en base. Une valeur libre
-- rendrait le filtre inutilisable au premier « Anglais/English » saisi à la
-- main.

begin;

-- =============================================================================
-- 1. LES COLONNES
-- =============================================================================

alter table repetiteurs
  add column if not exists langues_cours text[] not null default '{}',
  add column if not exists moments text[] not null default '{}';

comment on column repetiteurs.langues_cours is
  'Langues dans lesquelles il assure la séance. « fr », « en ». Plusieurs possibles.';
comment on column repetiteurs.moments is
  'Moments où il peut, pour le filtre seulement. Le détail reste dans disponibilites_texte.';

-- Listes fermées. Un tableau vide passe : c'est l'état d'une fiche qu'on
-- vient d'ouvrir, et on ne bloque pas quelqu'un qui n'a pas encore rempli.
alter table repetiteurs drop constraint if exists repetiteurs_langues_cours_connues;
alter table repetiteurs add constraint repetiteurs_langues_cours_connues
  check (langues_cours <@ array['fr', 'en']::text[]);

alter table repetiteurs drop constraint if exists repetiteurs_moments_connus;
alter table repetiteurs add constraint repetiteurs_moments_connus
  check (
    moments <@ array[
      'semaine_apres_ecole',
      'semaine_soir',
      'samedi',
      'dimanche'
    ]::text[]
  );

-- Les tableaux se filtrent par recouvrement (`&&`) : un index GIN sert.
create index if not exists repetiteurs_langues_cours
  on repetiteurs using gin (langues_cours);
create index if not exists repetiteurs_moments
  on repetiteurs using gin (moments);

-- Les fiches qui existaient avant.
--
-- Le français, et non les deux : l'affirmer bilingue serait inventer une
-- donnée, et un parent de Bamenda tomberait sur quelqu'un qui ne peut pas
-- l'aider. Chacun ajoutera l'anglais s'il l'enseigne — c'est à lui de le dire.
-- Les moments restent vides : rien dans le texte libre ne se convertit sans
-- l'interpréter.
update repetiteurs set langues_cours = array['fr'] where langues_cours = '{}';

-- =============================================================================
-- 2. LE DOSSIER PUBLIC LES REND
-- =============================================================================

create or replace function repetiteur_public(rid uuid)
returns table (
  id uuid,
  prenom text,
  nom text,
  photo_url text,
  bio text,
  ville text,
  matieres text[],
  niveaux text[],
  tarif_mensuel integer,
  annees_experience smallint,
  disponibilites_texte text,
  langues_cours text[],
  moments text[],
  verifie_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, p.prenom, p.nom, r.photo_url, r.bio, r.ville,
         r.matieres, r.niveaux, r.tarif_mensuel, r.annees_experience,
         r.disponibilites_texte, r.langues_cours, r.moments, r.verifie_le
    from repetiteurs r
    join profils p on p.id = r.id
   where r.id = rid
     and r.statut = 'verifie';
$$;

revoke all on function repetiteur_public(uuid) from public;
grant execute on function repetiteur_public(uuid) to anon, authenticated;

commit;
