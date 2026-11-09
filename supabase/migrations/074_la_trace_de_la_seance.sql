-- La séance laisse enfin une trace.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUI ÉTAIT PROMIS, ET QUI N'EXISTAIT PAS
--
-- Le dossier d'un répétiteur dit à un parent, mot pour mot : « La séance se
-- tient dans la salle de TUTELA, elle est enregistrée. Votre enfant n'est
-- jamais seul avec lui. » La salle allume un voyant rouge intitulé « La
-- séance est enregistrée ». L'administration propose « Lire
-- l'enregistrement » et sait en faire une URL signée.
--
-- Rien n'enregistrait. `seances_humaines.enregistrement_url` existe depuis le
-- schéma initial et AUCUNE ligne de code ne l'écrit — ni le site, ni le
-- service. Le chemin de lecture était construit en entier au-dessus d'un
-- chemin d'écriture qui n'a jamais été posé.
--
-- Pour une application dont la promesse entière est qu'un enfant n'est jamais
-- seul avec un adulte, c'est la promesse elle-même qui était creuse.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI CE N'EST PAS UNE VIDÉO
--
-- Une vidéo de la salle demanderait un serveur de média, de la bande passante
-- en continu, et des centaines de mégaoctets par séance. Au Cameroun, sur une
-- connexion mobile, elle ne se téléverserait pas — et une trace qui n'arrive
-- pas ne protège personne.
--
-- Or la salle synchronise déjà l'INTENTION et non l'image : ce qui circule,
-- c'est la trajectoire d'un trait, la chaîne « (2x+1)/(x-1) », une frappe
-- dans l'énoncé. Quelques dizaines d'octets chacun. La séance rejouée EST
-- cette suite d'intentions remise dans l'ordre.
--
-- On garde donc ce qui passait déjà, horodaté. Le poids est celui du cours
-- lui-même, et la relecture est exacte : trait par trait, à la vitesse qu'on
-- veut. C'est le même principe que le traceur, poussé jusqu'au bout.
--
-- Elle s'indexe toute seule, en prime : chaque ligne porte sa feuille, et
-- chaque feuille porte son outil. « Montre-moi le moment où il a tracé la
-- courbe » est une requête, pas un visionnage.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QU'ON NE PEUT PAS FAIRE À UNE PIÈCE
--
-- La table est en AJOUT SEUL. Aucune politique de modification, aucune de
-- suppression — pas même pour l'administration, pas même pour les deux
-- parties. Une trace qu'on peut retoucher après coup ne prouve rien, et c'est
-- précisément le jour où elle compte qu'on voudrait la retoucher.
--
-- `je_tiens_la_seance` refuse déjà d'écrire sur une séance close. La trace en
-- hérite : une fois la séance terminée, plus rien ne s'y ajoute.

begin;

-- =============================================================================
-- 1. LA TABLE
-- =============================================================================

create table if not exists traces_salle (
  id         bigint generated always as identity primary key,

  seance_id  uuid not null references seances_humaines(id) on delete cascade,
  feuille_id uuid not null references feuilles(id) on delete cascade,

  -- Millisecondes depuis l'ouverture de la séance, et non un horodatage
  -- absolu : c'est la POSITION dans le cours qu'on rejoue. Les deux horloges
  -- des deux navigateurs ne sont pas d'accord à la seconde près, celle du
  -- serveur si — `pose_le` la garde à côté pour les départager en cas de
  -- doute.
  t_ms       integer not null check (t_ms >= 0),

  -- Qui a fait ce geste. La couleur à l'écran le dit déjà pendant la séance ;
  -- la trace doit le dire encore six mois plus tard, quand plus personne ne
  -- se souvient qui avait l'ambre.
  auteur     uuid not null references profils(id),

  -- La mise à jour Yjs, telle qu'elle est passée sur le réseau.
  maj        bytea not null,

  pose_le    timestamptz not null default now()
);

comment on table traces_salle is
  'La séance rejouable : chaque intention qui a traversé la salle, horodatée. En ajout seul.';

-- L'ordre de relecture. C'est la seule lecture qui existe : « toute la séance,
-- dans l''ordre », éventuellement filtrée sur une feuille.
create index if not exists traces_salle_lecture
  on traces_salle (seance_id, t_ms, id);

create index if not exists traces_salle_par_feuille
  on traces_salle (feuille_id, t_ms, id);

alter table traces_salle enable row level security;

-- =============================================================================
-- 2. L'INTERRUPTEUR, VÉRIFIÉ EN BASE
-- =============================================================================

/**
 * L'enregistrement est-il allumé ?
 *
 * Vérifié ICI et pas seulement dans le navigateur. Un interrupteur qui ne
 * vit que dans le client n'est pas un interrupteur : il suffit d'un onglet
 * bricolé pour capter une séance que l'administration croyait non captée.
 * Et dans l'autre sens — c'est celui qui compte — une famille à qui on a dit
 * « rien n'est enregistré » doit pouvoir le tenir pour vrai.
 */
create or replace function enregistrement_allume()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select valeur::text::boolean from parametres where cle = 'enregistrement_actif'),
    false
  );
$$;

revoke all on function enregistrement_allume() from public, anon;
grant execute on function enregistrement_allume() to authenticated;

-- =============================================================================
-- 3. QUI LIT, QUI ÉCRIT
-- =============================================================================

-- Lire : exactement ceux qui lisent déjà le cahier. Les deux parties, l'adulte
-- qui a signé le contrat, et l'administration qui traite les signalements.
drop policy if exists "les parties relisent la seance" on traces_salle;
create policy "les parties relisent la seance" on traces_salle
  for select to authenticated
  using (ma_seance(seance_id) or est_admin());

-- Écrire : les deux parties, chacune en son propre nom, et seulement tant que
-- la séance est ouverte et que le module est allumé.
--
-- `auteur = auth.uid()` n'est pas une formalité : sans lui, le répétiteur
-- pourrait déposer une trace au nom de l'élève, et la pièce qui doit protéger
-- l'enfant se retournerait contre lui.
drop policy if exists "les deux parties deposent leur trace" on traces_salle;
create policy "les deux parties deposent leur trace" on traces_salle
  for insert to authenticated
  with check (
    je_tiens_la_seance(seance_id)
    and auteur = auth.uid()
    and enregistrement_allume()
  );

-- Ni modification, ni suppression. Volontairement AUCUNE politique :
-- sans politique, RLS refuse. Voir l'en-tête.

-- =============================================================================
-- 4. CE QU'ON SAIT D'UNE TRACE SANS LA LIRE
-- =============================================================================

/**
 * Le sommaire d'une séance enregistrée.
 *
 * Pour l'administration et pour le parent : savoir qu'il existe une trace, de
 * quelle durée, sur combien de feuilles — sans télécharger la séance entière.
 * Un parent qui ouvre « les cours de mon enfant » veut d'abord savoir s'il y a
 * quelque chose à voir.
 */
create or replace function sommaire_de_la_trace(cible uuid)
returns table (
  gestes       bigint,
  feuilles     bigint,
  duree_ms     integer,
  premier_le   timestamptz,
  dernier_le   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint,
         count(distinct t.feuille_id)::bigint,
         coalesce(max(t.t_ms), 0),
         min(t.pose_le),
         max(t.pose_le)
    from traces_salle t
   where t.seance_id = cible
     and (ma_seance(cible) or est_admin());
$$;

revoke all on function sommaire_de_la_trace(uuid) from public, anon;
grant execute on function sommaire_de_la_trace(uuid) to authenticated;

commit;
