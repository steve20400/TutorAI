-- Qui décide qu'une séance est enregistrée.
--
-- ─────────────────────────────────────────────────────────────────────────
-- TROIS NIVEAUX, ET UN SEUL ORDRE POSSIBLE
--
-- 1. L'ADMINISTRATION, pour toute la plateforme (`enregistrement_actif`).
--    Tant qu'elle n'a pas allumé, la fonctionnalité N'EXISTE PAS : personne
--    d'autre ne la voit, personne ne peut l'allumer dans son coin.
--
-- 2. L'ADMINISTRATION, compte par compte (`enregistrement_permis`).
--    C'est la porte de l'abonnement. L'enregistrement sera payant : le jour
--    où le paiement arrivera, c'est cette colonne qu'il basculera. On la pose
--    MAINTENANT pour que ce jour-là il n'y ait qu'un interrupteur à brancher,
--    et pas une cascade de droits à réinventer sous la pression.
--
-- 3. LE PARENT, pour son propre compte (`enregistrement_souhaite`).
--    Par défaut OUI : dès que l'administration allume, ça s'active chez tout
--    le monde. C'est à celui qui n'en veut pas de le dire, pas à celui qui en
--    veut de le demander — un enregistrement qu'il faut réclamer n'existerait
--    pour presque personne, et c'est la promesse du produit.
--
-- Le résultat est un ET, pas un vote :
--
--     enregistré  =  allumé globalement
--                ET  permis sur ce compte
--                ET  souhaité par ce parent
--
-- Il suffit donc d'un seul NON pour que rien ne soit capté. C'est le bon sens
-- pour une donnée aussi sensible que la voix d'un enfant : on ne capte jamais
-- quelqu'un « par défaut d'opposition de l'un des trois ».
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI LE PARENT, ET PAS LE RÉPÉTITEUR
--
-- C'est le parent qui engage le répétiteur, qui paie, et dont l'enfant est
-- dans la salle. C'est lui qui consent pour un mineur, et lui seul.
--
-- Un répétiteur qui pourrait couper l'enregistrement de sa propre séance
-- déciderait de la disparition de la pièce qui protège l'élève contre lui.
-- La question ne se pose donc pas : il voit que ça enregistre, il ne choisit
-- pas que ça enregistre.
--
-- Pour un étudiant majeur qui contracte pour lui-même, `parent_id` porte son
-- propre identifiant : c'est bien lui qui décide, et la même règle s'applique
-- sans cas particulier.

begin;

-- =============================================================================
-- 1. LES DEUX COLONNES
-- =============================================================================

alter table profils
  add column if not exists enregistrement_permis boolean not null default true,
  add column if not exists enregistrement_souhaite boolean not null default true;

comment on column profils.enregistrement_permis is
  'L''administration autorise-t-elle l''enregistrement pour ce compte ? Deviendra la porte de l''abonnement payant.';
comment on column profils.enregistrement_souhaite is
  'Le parent veut-il que les séances de sa famille soient enregistrées ? Oui par défaut.';

-- =============================================================================
-- 2. LA RÈGLE, ÉCRITE UNE SEULE FOIS
-- =============================================================================

/**
 * Cette séance est-elle enregistrée ?
 *
 * Une seule fonction, et toutes les politiques l'appellent. Trois copies
 * d'une règle à trois conditions finissent par diverger, et c'est la copie
 * oubliée qui capte une famille qui avait dit non.
 *
 * `create or replace` : le retour est un booléen et le restera. Des
 * politiques en dépendront — un `drop` deviendrait impossible dès le
 * deuxième passage.
 */
create or replace function enregistrement_de_la_seance(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select enregistrement_allume()
     and coalesce(
           (select p.enregistrement_permis and p.enregistrement_souhaite
              from seances_humaines s
              join contrats c on c.id = s.contrat_id
              join profils p on p.id = c.parent_id
             where s.id = cible),
           false
         );
$$;

revoke all on function enregistrement_de_la_seance(uuid) from public, anon;
grant execute on function enregistrement_de_la_seance(uuid) to authenticated;

/** La même règle, plus le mode qui capte la parole. */
create or replace function son_capte_pour(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select enregistrement_de_la_seance(cible)
     and coalesce(
           (select valeur #>> '{}' from parametres where cle = 'mode_enregistrement'),
           'cahier'
         ) in ('audio', 'video');
$$;

revoke all on function son_capte_pour(uuid) from public, anon;
grant execute on function son_capte_pour(uuid) to authenticated;

-- =============================================================================
-- 3. LES POLITIQUES SUIVENT LA CASCADE
-- =============================================================================

-- La trace des gestes. Elle vérifiait seulement l'interrupteur global : une
-- famille qui avait dit non était quand même captée.
drop policy if exists "les deux parties deposent leur trace" on traces_salle;
create policy "les deux parties deposent leur trace" on traces_salle
  for insert to authenticated
  with check (
    je_tiens_la_seance(seance_id)
    and auteur = auth.uid()
    and enregistrement_de_la_seance(seance_id)
  );

-- La parole.
drop policy if exists "les deux parties deposent leur voix" on morceaux_voix;
create policy "les deux parties deposent leur voix" on morceaux_voix
  for insert to authenticated
  with check (
    je_tiens_la_seance(seance_id)
    and auteur = auth.uid()
    and son_capte_pour(seance_id)
  );

-- Et le coffre, qui est l'autre porte : sans cette reprise, un onglet
-- bricolé pourrait y déposer du son sans jamais écrire la ligne.
drop policy if exists "les deux parties televersent leur voix" on storage.objects;
create policy "les deux parties televersent leur voix" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voix'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = auth.uid()::text
    and je_tiens_la_seance(((storage.foldername(name))[1])::uuid)
    and son_capte_pour(((storage.foldername(name))[1])::uuid)
  );

-- =============================================================================
-- 4. CE QUE CHACUN A LE DROIT DE CHANGER
-- =============================================================================

/**
 * Le parent change SON choix, et rien d'autre.
 *
 * Par une fonction et non par une politique d'`update` sur `profils` :
 * ouvrir la table entière pour un booléen laisserait modifier le prénom,
 * l'identifiant, la photographie — et il a fallu une migration entière pour
 * fermer l'adresse électronique.
 *
 * Elle refuse si l'administration n'a pas allumé : sans quoi on pourrait
 * exprimer un choix sur une fonctionnalité qui n'existe pas encore, et le
 * retrouver appliqué le jour de l'allumage sans l'avoir voulu.
 */
create or replace function je_choisis_l_enregistrement(valeur boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not enregistrement_allume() then
    raise exception 'enregistrement_indisponible'
      using hint = 'Le module est éteint pour toute la plateforme.';
  end if;

  update profils
     set enregistrement_souhaite = valeur
   where id = auth.uid()
     -- Un compte que l'administration a fermé ne se rouvre pas tout seul.
     -- C'est la porte de l'abonnement : elle s'ouvre par le paiement, pas
     -- par un interrupteur dans les réglages.
     and enregistrement_permis;

  return found;
end;
$$;

revoke all on function je_choisis_l_enregistrement(boolean) from public, anon;
grant execute on function je_choisis_l_enregistrement(boolean) to authenticated;

/**
 * Ce que le parent voit de son propre réglage.
 *
 * Trois informations, pas une : est-ce allumé pour la plateforme, est-ce
 * permis sur mon compte, et qu'ai-je choisi. L'écran a besoin des trois pour
 * dire la vérité — « indisponible », « coupé par l'administration », ou un
 * interrupteur qui marche.
 */
create or replace function mon_enregistrement()
returns table (allume boolean, permis boolean, souhaite boolean)
language sql
stable
security definer
set search_path = public
as $$
  select enregistrement_allume(),
         p.enregistrement_permis,
         p.enregistrement_souhaite
    from profils p
   where p.id = auth.uid();
$$;

revoke all on function mon_enregistrement() from public, anon;
grant execute on function mon_enregistrement() to authenticated;

/**
 * L'administration ouvre ou ferme un compte précis.
 *
 * C'est l'interrupteur que le paiement actionnera. Posé maintenant, il sera
 * branché le jour venu — plutôt que réinventé dans l'urgence au milieu d'une
 * intégration de paiement.
 */
create or replace function admin_permet_l_enregistrement(compte uuid, valeur boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not est_admin() then
    raise exception 'reserve_a_l_administration';
  end if;

  update profils set enregistrement_permis = valeur where id = compte;
  return found;
end;
$$;

revoke all on function admin_permet_l_enregistrement(uuid, boolean) from public, anon;
grant execute on function admin_permet_l_enregistrement(uuid, boolean) to authenticated;

commit;
