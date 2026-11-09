-- Ce qui a été DIT pendant la séance.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI LE SON EST LA PIÈCE QUI COMPTE
--
-- La trace des gestes (migration 074) rejoue le cahier : les traits, les
-- formules, les courbes. Elle dit ce qui a été ÉCRIT. Elle ne dit rien de ce
-- qui a été dit — et pour protéger un enfant seul en visioconférence avec un
-- adulte, c'est la parole qui compte. Un cahier de mathématiques impeccable
-- ne prouve rien sur le ton employé, ni sur ce qui a été demandé à l'élève.
--
-- Le son coûte un dixième de la vidéo. C'est la meilleure protection par
-- franc dépensé, et la seule qui tienne sur les réseaux camerounais.
--
-- ─────────────────────────────────────────────────────────────────────────
-- EN MORCEAUX, ET C'EST TOUT L'INTÉRÊT
--
-- On n'envoie pas un fichier d'une heure à la fin de la séance. Trois raisons,
-- et chacune suffirait :
--
-- 1. Une coupure réseau en milieu de séance ne coûte qu'un morceau, pas
--    l'heure entière. Au Cameroun la coupure est le quotidien.
-- 2. Un téléversement de cinquante mégaoctets d'un coup, sur un montant
--    mobile partagé, échoue — et il échoue APRÈS la séance, quand plus
--    personne ne regarde l'écran pour s'en apercevoir.
-- 3. Un onglet fermé brutalement, une batterie vide, un navigateur tué par le
--    système : avec un fichier unique, tout est perdu. Avec des morceaux, on
--    garde tout jusqu'à la dernière poignée de secondes.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CHACUN SA PISTE, ET CE N'EST PAS UNE ÉCONOMIE
--
-- Il n'y a pas de serveur pour mélanger les deux micros : chaque navigateur
-- enregistre le sien. Deux pistes, recalées par leur position dans la séance.
--
-- C'est mieux qu'un mélange, et pas seulement plus simple : on sait QUI a dit
-- quoi. Sur une piste mélangée, deux voix qui se superposent ne s'attribuent
-- plus — et c'est précisément le passage qu'on viendrait écouter.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QU'ON NE PEUT PAS FAIRE À UNE PIÈCE
--
-- Ni modification, ni suppression, pour personne — comme `traces_salle` et
-- comme le coffre des pièces justificatives. Le jour où un enregistrement est
-- contesté est exactement le jour où quelqu'un voudrait le retoucher.

begin;

-- =============================================================================
-- 1. LE COFFRE
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voix', 'voix', false,
  -- 4 Mo par morceau. Un morceau de quinze secondes en Opus à 32 kbit/s pèse
  -- environ 60 Ko : le plafond est cent fois au-dessus, ce qui laisse passer
  -- un encodeur bavard sans laisser passer un fichier qui n'a rien à faire là.
  4194304,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 2. LE SON EST-IL CAPTÉ ?
-- =============================================================================

/**
 * Le mode d'enregistrement capte-t-il la parole ?
 *
 * Vérifié en base, comme `enregistrement_allume()`, et pour la même raison :
 * une famille à qui on a dit « seul le cahier est gardé » doit pouvoir le
 * tenir pour vrai, quoi que fasse un onglet bricolé.
 *
 * Les deux conditions comptent. Le module peut être allumé sur le mode
 * « cahier » — c'est même l'état par défaut après la migration 075 — et dans
 * ce cas aucun micro ne doit pouvoir déposer quoi que ce soit.
 */
drop function if exists son_capte();

create function son_capte()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select enregistrement_allume()
     and coalesce(
           (select valeur #>> '{}' from parametres where cle = 'mode_enregistrement'),
           'cahier'
         ) in ('audio', 'video');
$$;

revoke all on function son_capte() from public, anon;
grant execute on function son_capte() to authenticated;

-- =============================================================================
-- 3. LES MORCEAUX
-- =============================================================================

create table if not exists morceaux_voix (
  id         bigint generated always as identity primary key,

  seance_id  uuid not null references seances_humaines(id) on delete cascade,
  auteur     uuid not null references profils(id),

  -- Le rang dans la piste de CET auteur. Deux pistes parallèles ont chacune
  -- leur numérotation, et c'est `t_ms` qui les recale l'une sur l'autre.
  rang       integer not null check (rang >= 0),

  -- Où commence ce morceau dans la séance, en millisecondes. Comme pour la
  -- trace des gestes : une position, pas un horodatage. C'est elle qui permet
  -- d'écouter « la douzième minute » sans tout télécharger.
  t_ms       integer not null check (t_ms >= 0),
  duree_ms   integer not null check (duree_ms > 0),

  -- Le chemin dans le coffre. Jamais une URL : elle serait périmée, et une
  -- URL stockée est une URL qui finit par fuiter.
  chemin     text not null unique,
  octets     integer not null check (octets > 0),

  pose_le    timestamptz not null default now(),

  -- Un morceau par rang et par piste. Un double dépôt — reprise après
  -- coupure, onglet dupliqué — ferait entendre deux fois le même passage,
  -- donc un cours qui n'a pas eu lieu.
  unique (seance_id, auteur, rang)
);

comment on table morceaux_voix is
  'La parole de la séance, en morceaux de quelques secondes. Une piste par participant. En ajout seul.';

create index if not exists morceaux_voix_lecture
  on morceaux_voix (seance_id, t_ms, id);

alter table morceaux_voix enable row level security;

-- =============================================================================
-- 4. QUI LIT, QUI ÉCRIT
-- =============================================================================

drop policy if exists "les parties reecoutent la seance" on morceaux_voix;
create policy "les parties reecoutent la seance" on morceaux_voix
  for select to authenticated
  using (ma_seance(seance_id) or est_admin());

drop policy if exists "les deux parties deposent leur voix" on morceaux_voix;
create policy "les deux parties deposent leur voix" on morceaux_voix
  for insert to authenticated
  with check (
    je_tiens_la_seance(seance_id)
    and auteur = auth.uid()
    and son_capte()
  );

-- Ni modification, ni suppression : aucune politique, volontairement.

-- =============================================================================
-- 5. LE COFFRE SUIT LES MÊMES RÈGLES
-- =============================================================================

-- Le chemin est `<seance>/<auteur>/<rang>.webm`. Les deux premiers dossiers
-- ne sont pas décoratifs : ce sont eux que la politique vérifie.
--
-- Sans la condition sur le second dossier, le répétiteur pourrait déposer du
-- son dans la piste de l'élève — et la pièce censée protéger l'enfant
-- deviendrait l'outil le plus commode pour lui nuire.
drop policy if exists "les deux parties televersent leur voix" on storage.objects;
create policy "les deux parties televersent leur voix" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voix'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = auth.uid()::text
    and son_capte()
    and je_tiens_la_seance(((storage.foldername(name))[1])::uuid)
  );

-- Lire : jamais le fichier en direct, toujours par URL signée de courte durée
-- — mais c'est bien cette politique qui autorise à en demander une.
drop policy if exists "les parties relisent la voix" on storage.objects;
create policy "les parties relisent la voix" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voix'
    and (
      est_admin()
      or ma_seance(((storage.foldername(name))[1])::uuid)
    )
  );

-- Ni remplacement, ni effacement dans le coffre. Comme pour les pièces
-- justificatives : ce qui a servi de preuve ne se reprend pas.

commit;
