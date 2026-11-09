-- Ce qu'on capte d'une séance, et à quel prix.
--
-- ─────────────────────────────────────────────────────────────────────────
-- TROIS RÉGLAGES, PAS UN INTERRUPTEUR DE PLUS
--
-- `enregistrement_actif` dit SI l'on enregistre. Il ne dit pas QUOI. Jusqu'ici
-- la seule réponse possible était « le cahier », parce que c'était la seule
-- chose que la salle savait garder. L'administration doit pouvoir décider
-- d'aller plus loin — et voir ce que ça coûte avant de le décider.
--
-- `mode_enregistrement` : le cahier, le cahier et le son, ou les trois.
-- `debit_audio`         : la parole, en kbit/s.
-- `debit_video`         : l'image, en kbit/s.
--
-- Un seul mode plutôt que trois cases à cocher : des cases indépendantes
-- laissent composer des réglages qui n'ont pas de sens — filmer sans le son,
-- par exemple, ce qui coûte cher et ne prouve rien.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI LE SON AVANT L'IMAGE
--
-- Pour protéger un enfant, ce qu'un adulte lui DIT compte plus que son image.
-- Le son coûte environ un dixième de la vidéo et porte l'essentiel de ce
-- qu'on voudrait pouvoir relire le jour où quelque chose s'est mal passé.
--
-- Et la contrainte, au Cameroun, n'est pas le disque : c'est le téléversement.
-- Une heure filmée à 600 kbit/s exige 600 kbit/s de montant CONTINU des deux
-- côtés. Sur une connexion mobile partagée, ça ne passe pas — et
-- l'enregistrement dégrade la séance pendant qu'il échoue à arriver. Le son
-- seul tient dans 24 kbit/s, ce qui passe à peu près partout.
--
-- D'où l'ordre, qui n'est pas un hasard : le cahier, puis le son, puis
-- l'image.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUI EXISTE AUJOURD'HUI, ET CE QUI N'EXISTE PAS
--
-- Le mode `cahier` fonctionne : la migration 074 a posé `traces_salle`, et la
-- salle y dépose chaque geste. Les modes `audio` et `video` N'ONT PAS ENCORE
-- DE CAPTURE — rien dans le navigateur n'enregistre encore un micro ni une
-- caméra.
--
-- Les réglages naissent donc sur `cahier`, et l'écran d'administration le dit
-- en toutes lettres. C'est exactement ce qui manquait à `enregistrement_url` :
-- une colonne prête, une lecture prête, et personne pour dire que rien
-- n'écrivait. On ne refait pas ça.

begin;

insert into parametres (cle, valeur, libelle) values
  ('mode_enregistrement', '"cahier"'::jsonb,
   'Ce qui est capté : le cahier, le son, ou l''image'),
  ('debit_audio', '24'::jsonb,
   'Débit de la parole enregistrée, en kbit/s'),
  ('debit_video', '300'::jsonb,
   'Débit de l''image enregistrée, en kbit/s')
on conflict (cle) do nothing;

-- `do nothing` et non `do update` : si l'administration a déjà réglé ces
-- valeurs, une migration rejouée ne doit pas les écraser. Un réglage choisi
-- par quelqu'un vaut mieux qu'un défaut choisi par moi.

commit;
