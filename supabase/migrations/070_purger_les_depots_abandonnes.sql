-- Effacer les pièces de ceux qui ne se sont jamais inscrits.
--
-- La migration 067 ouvre un dépôt provisoire : on photographie sa carte
-- d'identité AVANT de créer son compte. Quelqu'un dépose trois documents, le
-- réseau coupe, ou il renonce — et ses pièces restent. Des cartes d'identité
-- d'inconnus, rattachées à personne, que personne ne viendra chercher. Les
-- garder serait garder des pièces d'identité sans dossier ni consentement,
-- sur une plateforme dont c'est la promesse inverse.
--
-- `purger_depots_abandonnes()` existait déjà, et rendait les chemins à
-- effacer. Deux choses lui manquaient pour servir.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 1. PERSONNE N'AVAIT LE DROIT D'EFFACER DANS LE SEAU
--
-- La migration 020 le dit en toutes lettres : « Qui efface — Personne. Une
-- pièce qui a servi à vérifier quelqu'un est la preuve que la vérification a
-- eu lieu. » C'est juste, et ça ne vaut que pour une pièce qui a servi.
--
-- Un dépôt abandonné n'a vérifié personne : il n'est rattaché à aucun compte,
-- il a expiré, et il ne prouve rien. La porte qu'on ouvre ici est donc étroite
-- à dessein — l'administration seule, sous `depots/`, et uniquement pour un
-- jeton que la base reconnaît comme abandonné. Une pièce rattachée à un
-- répétiteur reste intouchable, par tout le monde, comme avant.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 2. IL FALLAIT POUVOIR COMPTER AVANT D'EFFACER
--
-- Un bouton « purger » qui ne dit pas ce qu'il va emporter n'est pas un
-- bouton, c'est un pari. On compte d'abord.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI PAS AUTOMATIQUE
--
-- Parce que supprimer une ligne de `storage.objects` ne supprime pas le
-- fichier : c'est le service de stockage qui détient le dépôt réel, et seule
-- son API le retire. Un `pg_cron` qui effacerait les lignes laisserait les
-- octets derrière lui, invisibles de partout et pourtant bien là — le pire
-- des deux états, puisqu'on croirait avoir effacé.
--
-- Appeler cette API demanderait une clé de service, que le service refuse
-- délibérément de détenir : il n'agit qu'avec le jeton de celui qui l'appelle,
-- et c'est ce qui garde les règles de protection écrites à un seul endroit.
-- La purge passe donc par l'administration, dont le jeton suffit — et le
-- compte s'affiche dans son espace pour qu'on n'ait pas à y penser.

begin;

-- =============================================================================
-- 1. CE QUI EST ABANDONNÉ
-- =============================================================================

/**
 * Un jeton de dépôt abandonné : expiré depuis plus d'un jour, jamais rattaché.
 *
 * Le délai de grâce compte. Une inscription peut échouer au dernier moment —
 * adresse déjà prise, réseau coupé — et la personne recommence une heure plus
 * tard avec les mêmes documents. Effacer à l'expiration sèche lui ferait tout
 * reprendre pour une erreur qui n'était pas la sienne.
 *
 * `stable` et non `volatile` : elle ne change rien, et la politique de
 * stockage ci-dessous l'appelle à chaque fichier d'une suppression groupée.
 */
create or replace function depot_abandonne(le_jeton uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from depots_inscription d
     where d.jeton = le_jeton
       and d.rattache_a is null
       and d.expire_le < now() - interval '24 hours'
  );
$$;

grant execute on function depot_abandonne(uuid) to authenticated;

/**
 * Ce qu'une purge emporterait, sans rien emporter.
 *
 * L'administration la lit avant de décider. Les chemins sont rendus parce
 * qu'il faut les passer au service de stockage, qui seul retire les fichiers.
 */
create or replace function depots_abandonnes()
returns table (jeton uuid, chemin text, depose_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select f.jeton, f.chemin, f.depose_le
    from depots_fichiers f
    join depots_inscription d on d.jeton = f.jeton
   where est_admin()
     and d.rattache_a is null
     and d.expire_le < now() - interval '24 hours'
   order by f.depose_le;
$$;

revoke all on function depots_abandonnes() from public, anon;
grant execute on function depots_abandonnes() to authenticated;

-- =============================================================================
-- 2. LA PORTE ÉTROITE DU SEAU
-- =============================================================================

-- La seule suppression autorisée dans `pieces`, et elle ne touche rien de ce
-- que la migration 020 protégeait : ni une pièce rattachée à un répétiteur,
-- ni un dépôt encore vivant. L'administration seule, sous `depots/`, et
-- seulement sur un jeton que la base reconnaît comme abandonné.
drop policy if exists "l'administration efface un depot abandonne"
  on storage.objects;
create policy "l'administration efface un depot abandonne" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pieces'
    and est_admin()
    and (storage.foldername(name))[1] = 'depots'
    and array_length(storage.foldername(name), 1) = 2
    and depot_abandonne(((storage.foldername(name))[2])::uuid)
  );

-- =============================================================================
-- 3. EFFACER LES LIGNES, UNE FOIS LES FICHIERS PARTIS
-- =============================================================================

/**
 * Retire les dépôts abandonnés de la base.
 *
 * Appelée APRÈS que le service de stockage a retiré les fichiers, et pas
 * avant : dans l'autre ordre, un échec du stockage laisserait des octets sans
 * aucune ligne pour dire qu'ils existent — on les croirait effacés.
 *
 * Elle remplace la version de la migration 067, qui rendait les chemins sans
 * vérifier qui appelait et sans le délai de grâce.
 */
drop function if exists purger_depots_abandonnes();
create or replace function purger_depots_abandonnes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  combien integer;
begin
  if not est_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;

  with partis as (
    delete from depots_inscription d
     where d.rattache_a is null
       and d.expire_le < now() - interval '24 hours'
    returning d.jeton
  )
  select count(*) into combien from partis;

  return combien;
end; $$;

revoke all on function purger_depots_abandonnes() from public, anon;
grant execute on function purger_depots_abandonnes() to authenticated;

commit;
