-- Le dossier d'un répétiteur, tel qu'un parent a le droit de le lire.
--
-- L'annuaire dit qu'un répétiteur a été contrôlé. Le dossier dit SUR QUOI —
-- pièce d'identité, casier, diplôme — et à quelle date chacune a été examinée.
-- C'est la promesse entière du produit, et elle ne vaut que si elle est
-- vérifiable pièce par pièce plutôt qu'affirmée en bloc.
--
-- Rien de tout cela n'était lisible par un parent : `pieces_justificatives`
-- est fermée, et pour de bonnes raisons — elle porte `chemin`, l'emplacement
-- du document dans un seau privé. Une politique de lecture sur la table
-- l'aurait donné avec le reste.
--
-- D'où deux fonctions qui rendent exactement ce que l'écran affiche. Le
-- chemin du document ne sort jamais, et le statut d'examen non plus : un
-- parent apprend qu'une pièce a été contrôlée, pas qu'une autre a été jugée
-- illisible. Ce jugement appartient à l'administration et au répétiteur.
--
-- Les deux ne répondent que pour un répétiteur VÉRIFIÉ. Sans cette condition,
-- elles diraient qui a déposé un dossier — y compris les refusés, et ceux que
-- personne n'a encore regardés.

begin;

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
  verifie_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, p.prenom, p.nom, r.photo_url, r.bio, r.ville,
         r.matieres, r.niveaux, r.tarif_mensuel, r.annees_experience,
         r.disponibilites_texte, r.verifie_le
    from repetiteurs r
    join profils p on p.id = r.id
   where r.id = rid
     and r.statut = 'verifie';
$$;

-- Les pièces contrôlées, sans leur emplacement ni leur verdict.
--
-- `lisible` seulement : une pièce déposée mais pas encore examinée n'a rien
-- prouvé, et une pièce refusée ou illisible ne regarde que l'administration
-- et celui qui l'a déposée. Montrer « Casier judiciaire — refusé » à un
-- parent reviendrait à publier un jugement sur une personne.
create or replace function pieces_controlees(rid uuid)
returns table (
  cle text,
  libelle_fr text,
  libelle_en text,
  examinee_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.cle, t.libelle_fr, t.libelle_en, j.examinee_le
    from pieces_justificatives j
    join types_pieces t on t.cle = j.type_cle
    join repetiteurs r on r.id = j.repetiteur_id
   where j.repetiteur_id = rid
     and j.statut = 'lisible'
     and r.statut = 'verifie'
   order by t.ordre;
$$;

revoke all on function repetiteur_public(uuid) from public;
revoke all on function pieces_controlees(uuid) from public;
grant execute on function repetiteur_public(uuid) to anon, authenticated;
grant execute on function pieces_controlees(uuid) to anon, authenticated;

commit;
