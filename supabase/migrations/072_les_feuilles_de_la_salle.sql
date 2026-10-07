-- Les feuilles de la salle de cours.
--
-- Une salle se divise en feuilles, comme un enseignant divise son tableau à la
-- craie : une pour le tracé, une pour le calcul, une pour l'énoncé. On en
-- ajoute autant qu'on veut pendant la séance, et chacune porte son propre
-- outil.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QU'ON STOCKE, ET POURQUOI CE N'EST PAS UNE IMAGE
--
-- `etat` est un document Yjs sérialisé — pas un dessin, pas un PNG. Yjs est un
-- CRDT : chaque navigateur garde sa copie, qui sait fusionner avec l'autre
-- sans qu'aucun serveur n'arbitre. C'est ce qui fait tenir la promesse qui
-- compte ici : **au Cameroun la coupure réseau est le quotidien**, et l'élève
-- doit pouvoir continuer d'écrire hors ligne, tout se recollant au retour sans
-- conflit ni perte.
--
-- Le principe qui commande tout le reste : on synchronise l'INTENTION, pas
-- l'image. Le traceur transmet la chaîne `(2x+1)/(x-1)` — vingt-et-un octets —
-- et chaque navigateur redessine la courbe de son côté. La main levée
-- transmet les points du tracé, jamais un bitmap. Sur une connexion à
-- 30 kbit/s, c'est la différence entre une séance qui marche et une séance
-- qu'on abandonne.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LE TRANSPORT A CHANGÉ, ET IL FAUT LE DIRE
--
-- La note du 22 septembre prévoyait un serveur WebSocket sur le service
-- Render. On y renonce, pour trois raisons constatées depuis :
--
-- — Render endort un service gratuit au bout de quinze minutes. Une salle qui
--   meurt au milieu d'un cours est pire que pas de salle.
-- — Le service est sans mémoire — une requête, une réponse. Un serveur de
--   synchronisation est l'inverse : il vit en continu et tient l'état des
--   salles ouvertes. C'est un autre animal, pas une route de plus.
-- — Supabase Realtime est déjà là, déjà authentifié, déjà gouverné par les
--   mêmes politiques RLS, et il vit dans le Supabase auto-hébergé prévu.
--
-- Les mises à jour voyagent donc par `broadcast` sur un canal par séance, et
-- cette table ne sert qu'à deux choses : retrouver ses feuilles en arrivant,
-- et les garder après la séance.
--
-- ─────────────────────────────────────────────────────────────────────────
-- QUI ÉCRIT, ET CE QUE ÇA PROTÈGE
--
-- Les deux parties de la séance, et elles seules. Un enregistrement de séance
-- est une pièce qui protège un enfant : il ne se modifie pas par un tiers, et
-- il ne se lit pas par un tiers non plus. L'administration lit — elle traite
-- les signalements — mais n'écrit pas : une feuille corrigée après coup par
-- l'administration ne prouverait plus rien.
--
-- Les feuilles SURVIVENT à la séance, c'est volontaire : l'élève révise
-- dessus, et le parent les voit à côté de la vidéo. Une séance laisse alors
-- deux traces, la vidéo et le cahier.

begin;

-- =============================================================================
-- 1. LA TABLE
-- =============================================================================

create type outil_feuille as enum (
  'main_levee',   -- le stylet, les points du tracé
  'texte',        -- l'énoncé, le plan, la correction écrite
  'calcul',       -- les symboles et les formules
  'traceur',      -- la courbe, redessinée de chaque côté
  'ecran'         -- un partage de fenêtre, qui est une feuille comme une autre
);

create table if not exists feuilles (
  id         uuid primary key default gen_random_uuid(),
  seance_id  uuid not null references seances_humaines(id) on delete cascade,
  -- L'ordre dans la salle. Un entier et non un rang calculé : on insère une
  -- feuille entre deux autres en milieu de séance, et renuméroter tout le
  -- monde ferait bouger les vignettes sous le doigt.
  rang       integer not null default 0,
  titre      text,
  outil      outil_feuille not null default 'main_levee',

  /**
   * L'état Yjs du document, sérialisé.
   *
   * Un instantané, pas un journal : Yjs sait rejouer son histoire, mais la
   * garder entière ferait grossir la ligne sans fin pour une séance d'une
   * heure. On écrase, et on garde la dernière version cohérente.
   */
  etat       bytea,
  maj_le     timestamptz not null default now(),
  cree_le    timestamptz not null default now()
);

create index if not exists feuilles_par_seance on feuilles (seance_id, rang);

alter table feuilles enable row level security;

-- =============================================================================
-- 2. QUI VOIT, QUI ÉCRIT
-- =============================================================================

/**
 * Cette séance est-elle la mienne ?
 *
 * Le chemin est long — une feuille appartient à une séance, qui appartient à
 * un contrat, qui lie un répétiteur à un élève, lequel a des adultes
 * rattachés. L'écrire une fois ici plutôt que dans chaque politique : trois
 * copies d'une jointure à cinq tables finissent par diverger, et c'est la
 * copie oubliée qui ouvre la porte.
 */
create or replace function ma_seance(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from seances_humaines s
      join contrats c on c.id = s.contrat_id
     where s.id = cible
       and (
         c.repetiteur_id = auth.uid()
         or c.eleve_id = auth.uid()
         -- L'adulte qui a signé ce contrat voit le cahier de son enfant.
         -- C'est la moitié de ce qu'on lui vend : la séance laisse une trace,
         -- et la trace se consulte.
         --
         -- Par le contrat et non par `liens_familiaux` : c'est celui qui a
         -- engagé le répétiteur qui regarde, pas tous les adultes rattachés à
         -- l'enfant. Un oncle rattaché par courtoisie n'a pas à lire le cahier
         -- d'un cours qu'il n'a pas demandé.
         or c.parent_id = auth.uid()
       )
  );
$$;

revoke all on function ma_seance(uuid) from public, anon;
grant execute on function ma_seance(uuid) to authenticated;

drop policy if exists "les deux parties voient les feuilles" on feuilles;
create policy "les deux parties voient les feuilles" on feuilles
  for select to authenticated
  using (ma_seance(seance_id) or est_admin());

/**
 * Qui écrit : le répétiteur et l'élève, et personne d'autre.
 *
 * Pas l'adulte rattaché, qui lit sans écrire — il n'était pas dans la salle,
 * et une main de plus sur le cahier rendrait la trace discutable. Pas
 * l'administration : une feuille corrigée après coup par celui qui arbitre les
 * signalements ne prouverait plus rien.
 */
create or replace function je_tiens_la_seance(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from seances_humaines s
      join contrats c on c.id = s.contrat_id
     where s.id = cible
       and (c.repetiteur_id = auth.uid() or c.eleve_id = auth.uid())
       -- Une séance close ne se réécrit pas. C'est ce qui sépare un cahier
       -- d'une pièce : on peut relire l'un comme l'autre, on ne peut plus
       -- rien ajouter à la seconde.
       and s.terminee_le is null
  );
$$;

revoke all on function je_tiens_la_seance(uuid) from public, anon;
grant execute on function je_tiens_la_seance(uuid) to authenticated;

drop policy if exists "les deux parties ouvrent une feuille" on feuilles;
create policy "les deux parties ouvrent une feuille" on feuilles
  for insert to authenticated
  with check (je_tiens_la_seance(seance_id));

drop policy if exists "les deux parties ecrivent sur la feuille" on feuilles;
create policy "les deux parties ecrivent sur la feuille" on feuilles
  for update to authenticated
  using (je_tiens_la_seance(seance_id))
  with check (je_tiens_la_seance(seance_id));

-- Personne n'efface. Une feuille retirée d'une séance enregistrée est un trou
-- dans la trace, et c'est exactement le jour d'un signalement qu'on
-- s'apercevrait qu'elle manque. On la vide, on ne la supprime pas.

-- =============================================================================
-- 3. LE TEMPS RÉEL
-- =============================================================================

-- La table entre dans la publication : l'arrivée d'une NOUVELLE feuille se
-- voit chez l'autre sans rien demander. Le contenu, lui, ne passe pas par là —
-- il voyage par `broadcast`, des dizaines de fois par seconde quand une main
-- dessine, ce qu'aucune table ne doit encaisser.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'feuilles'
  ) then
    alter publication supabase_realtime add table feuilles;
  end if;
end $$;

commit;
