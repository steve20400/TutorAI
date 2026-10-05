-- Chacun choisit son identifiant, et peut en changer.
--
-- ─────────────────────────────────────────────────────────────────────────
-- D'ABORD, UNE RÉPARATION. LA MIGRATION 067 A CASSÉ DEUX CHOSES.
--
-- Elle réécrit `gerer_nouvel_utilisateur()`, et je l'ai recopié depuis
-- `schema.sql` — qui date d'AVANT la migration 025. Deux lignes ont donc
-- reculé de quarante migrations, en silence, et sans qu'aucune compilation ni
-- aucun test ne puisse le voir :
--
-- 1. L'IDENTIFIANT. La 025 le met en forme et, s'il est absent ou déjà pris,
--    en fabrique un depuis le nom. La version recopiée le prenait brut :
--    comme aucun formulaire n'en envoie aujourd'hui, tout compte créé depuis
--    067 est né SANS identifiant. Ces comptes ne peuvent pas se connecter par
--    leur nom, et rien ne le leur dit.
--
-- 2. LE CONTRAT. La 025 crée la fiche du répétiteur avec la version de
--    contrat en cours. La version recopiée laissait zéro, et la politique de
--    la migration 001 écarte de l'annuaire quiconque n'est pas à jour : un
--    répétiteur vérifié serait resté invisible, sans que personne comprenne
--    pourquoi.
--
-- La leçon est écrite ici parce que c'est ici qu'on la relira : `schema.sql`
-- est l'état INITIAL, pas l'état courant. Une fonction qu'on remplace se
-- relit dans la dernière migration qui l'a touchée.
--
-- ─────────────────────────────────────────────────────────────────────────
-- ENSUITE, CE QUI EST DEMANDÉ.
--
-- L'identifiant était fabriqué par la machine et figé à vie. Il est pourtant
-- ce avec quoi on se connecte — et « alain nkoulou 2 », attribué parce qu'un
-- homonyme était arrivé avant, n'est le nom de personne.
--
-- Chacun le choisit donc à l'inscription, et peut en changer ensuite, comme
-- l'administration le fait déjà pour elle-même. Il reste unique pour tout le
-- monde à la fois : un enfant et un parent ne peuvent pas porter le même, et
-- la casse ne fait pas la différence — l'index unique sur `lower(identifiant)`
-- de la migration 025 y veille déjà.
--
-- Deux changements de fond par rapport à la 025, qui se taisait :
--
-- — Un identifiant proposé mais déjà pris ne se voit plus remplacé en douce.
--   On s'inscrivait sous le nom qu'on avait choisi, et on se retrouvait avec
--   un autre, découvert des jours plus tard en essayant de se connecter. On
--   refuse maintenant, et on le dit.
-- — Il se modifie. Le verrou de la migration 004 existait pour une raison
--   solide — un identifiant libéré par un compte supprimé peut être repris
--   par le suivant, qui hériterait de ce qu'on croyait savoir de l'ancien.
--   Mais ce verrou protégeait aussi contre un nom qu'on n'a jamais choisi.
--   On garde la trace du précédent : qui change de nom, on sait d'où il
--   vient.

begin;

-- =============================================================================
-- 1. SAVOIR SI UN IDENTIFIANT EST LIBRE
-- =============================================================================

/**
 * Cet identifiant est-il disponible ?
 *
 * Ouverte aux visiteurs anonymes, parce que c'est à l'inscription qu'on en a
 * besoin — avant d'avoir un compte, par définition.
 *
 * Ce qu'elle révèle, et pourquoi c'est acceptable : elle confirme qu'un nom
 * est pris. Un identifiant n'est pas un secret, il s'affiche dans l'annuaire
 * et sur les fiches ; le savoir pris n'ouvre aucune porte, et ne pas le dire
 * obligerait à laisser quelqu'un découvrir après coup qu'il porte un autre
 * nom que celui qu'il a écrit.
 *
 * Elle ne dit rien de PLUS : ni le rôle, ni la date, ni qui.
 */
create or replace function identifiant_disponible(saisie text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select normaliser_identifiant(saisie) is not null
     and not exists (
       select 1 from profils
        where lower(identifiant) = normaliser_identifiant(saisie)
     );
$$;

revoke all on function identifiant_disponible(text) from public;
grant execute on function identifiant_disponible(text) to anon, authenticated;

-- =============================================================================
-- 2. LE DÉCLENCHEUR D'INSCRIPTION, REMIS D'APLOMB
-- =============================================================================

create or replace function gerer_nouvel_utilisateur()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  role_demande text := coalesce(new.raw_user_meta_data ->> 'role', 'eleve');
  ident text;
  jeton_depot uuid;
begin
  -- `raw_user_meta_data` vient du client. N'importe qui peut appeler
  -- supabase.auth.signUp({options: {data: {role: 'admin'}}}) depuis un
  -- navigateur avec la clé publique — elle est publique, c'est son rôle.
  -- Faire confiance à ce champ donnerait les pleins pouvoirs à qui le demande.
  -- Tout rôle non prévu retombe sur 'eleve'. Un administrateur ne se crée
  -- qu'en SQL, jamais par inscription.
  if role_demande not in ('eleve', 'parent', 'repetiteur') then
    role_demande := 'eleve';
  end if;

  -- Celui que le client propose est remis en forme, jamais pris tel quel :
  -- sinon on pourrait s'inscrire sous « GALILEE » avec une autre casse.
  ident := normaliser_identifiant(new.raw_user_meta_data ->> 'identifiant');

  if ident is not null
     and exists (select 1 from profils where lower(identifiant) = ident) then
    -- Et on le DIT, au lieu d'en attribuer un autre en douce. L'application
    -- vérifie avant d'envoyer ; ce qui reste ici, c'est la course entre deux
    -- inscriptions simultanées sur le même nom. L'une des deux doit perdre,
    -- et apprendre pourquoi.
    raise exception 'Cet identifiant est déjà utilisé'
      using errcode = '23505';
  end if;

  -- Rien de proposé : on en fabrique un depuis le nom. C'est le cas de tout
  -- compte créé autrement que par le formulaire — et celui des comptes
  -- d'avant, qui n'avaient pas ce champ.
  if ident is null then
    ident := identifiant_depuis_nom(
      new.raw_user_meta_data ->> 'prenom',
      new.raw_user_meta_data ->> 'nom');
  end if;

  insert into profils (id, role, prenom, nom, telephone, identifiant, pays)
  values (
    new.id,
    role_demande::role_utilisateur,
    coalesce(new.raw_user_meta_data ->> 'prenom', 'Élève'),
    nullif(new.raw_user_meta_data ->> 'nom', ''),
    nullif(new.raw_user_meta_data ->> 'telephone', ''),
    ident,
    coalesce(new.raw_user_meta_data ->> 'pays', 'CM')
  );

  -- Un répétiteur a besoin d'une fiche dès l'inscription, même vide : sans
  -- elle, sa première visite au formulaire de profil n'aurait rien à modifier.
  -- Elle naît en 'brouillon', donc invisible des familles.
  --
  -- `version_contrat_acceptee` n'est pas décorative : la politique de la
  -- migration 001 écarte de l'annuaire quiconque est en retard d'une version.
  -- La laisser à zéro rendait le répétiteur invisible même une fois vérifié.
  if role_demande = 'repetiteur' then
    insert into repetiteurs (id, version_contrat_acceptee)
    values (new.id, (select version_contrat from facturation where id = 1));

    -- Les pièces déposées avant que ce compte n'existe (migration 067).
    begin
      jeton_depot := nullif(new.raw_user_meta_data ->> 'depot', '')::uuid;
    exception when others then
      jeton_depot := null;
    end;

    if jeton_depot is not null then
      insert into pieces_justificatives (repetiteur_id, type_cle, chemin)
      select new.id, f.type_cle, f.chemin
        from depots_fichiers f
        join depots_inscription d on d.jeton = f.jeton
       where f.jeton = jeton_depot
         and d.rattache_a is null
         and d.expire_le > now()
       order by f.depose_le;

      update depots_inscription
         set rattache_a = new.id, rattache_le = now()
       where jeton = jeton_depot and rattache_a is null;

      -- Le dossier part en vérification de lui-même : il a des pièces, il
      -- n'attend plus rien de son auteur. Le laisser en brouillon aurait
      -- demandé un clic de plus à quelqu'un qui ne peut pas encore se
      -- connecter pour le faire.
      if exists (select 1 from pieces_justificatives where repetiteur_id = new.id) then
        update repetiteurs set statut = 'en_attente' where id = new.id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- 3. RÉPARER CE QUE 067 A LAISSÉ DERRIÈRE
-- =============================================================================

-- Les comptes nés sans identifiant. Ils ne peuvent pas se connecter par leur
-- nom, et le leur rendre ne retire rien à personne.
do $$
declare
  orphelin record;
begin
  for orphelin in
    select p.id, p.prenom, p.nom from profils p where p.identifiant is null
  loop
    update profils
       set identifiant = identifiant_depuis_nom(orphelin.prenom, orphelin.nom)
     where id = orphelin.id;
  end loop;
end $$;

-- Les fiches nées à zéro.
--
-- Zéro ne peut venir que de là : la migration 001 a remonté toutes les fiches
-- existantes à 1, et le déclencheur de la 025 posait la version en cours. Le
-- jour où l'administration passera le contrat en version 2, les retardataires
-- seront à 1 — jamais à 0.
update repetiteurs
   set version_contrat_acceptee = (select version_contrat from facturation where id = 1)
 where version_contrat_acceptee = 0;

-- =============================================================================
-- 4. CHANGER D'IDENTIFIANT
-- =============================================================================

-- La trace des noms rendus.
--
-- C'est la raison pour laquelle la migration 004 avait figé l'identifiant : un
-- nom libéré peut être repris par quelqu'un d'autre, qui hériterait de ce
-- qu'on croyait savoir de l'ancien. Le verrou disparaît, la raison reste —
-- alors on garde l'histoire. Un signalement sur « alain nkoulou » datant de
-- mars doit pouvoir se rattacher à qui portait ce nom en mars.
create table if not exists identifiants_rendus (
  ancien      text not null,
  profil_id   uuid not null references profils(id) on delete cascade,
  rendu_le    timestamptz not null default now(),
  primary key (ancien, rendu_le)
);

create index if not exists identifiants_rendus_profil
  on identifiants_rendus (profil_id);

alter table identifiants_rendus enable row level security;

drop policy if exists "l'administration lit les identifiants rendus"
  on identifiants_rendus;
create policy "l'administration lit les identifiants rendus"
  on identifiants_rendus for select using (est_admin());

/**
 * Le garde-fou de `profils`, qui laisse enfin passer un changement de nom.
 *
 * Ce qu'il continue d'interdire, et c'est l'essentiel : se donner le rôle
 * d'administrateur, et changer le rôle de qui que ce soit. C'était le sujet
 * de la migration 004, et il n'a pas bougé.
 *
 * Ce qui change : l'identifiant se modifie, par son propriétaire. La politique
 * de mise à jour de `profils` ne laisse écrire que sa propre ligne, donc
 * « qui » est déjà réglé ailleurs ; ici on règle « comment ».
 *
 * La mise en forme est faite ICI et pas seulement dans l'application. C'est la
 * dernière porte avant la table : un appel direct à PostgREST avec la clé
 * publiable passerait à côté de tout le reste.
 */
create or replace function proteger_role_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if est_admin() then
    -- L'administration met quand même en forme ce qu'elle écrit : deux
    -- identifiants qui ne diffèrent que par la casse se ressemblent trop pour
    -- cohabiter, et l'index unique les refuserait de toute façon.
    if new.identifiant is not null then
      new.identifiant := normaliser_identifiant(new.identifiant);
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'Un compte ne se donne pas le rôle d''administrateur'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Seule l''administration peut changer le rôle d''un compte'
      using errcode = '42501';
  end if;

  if new.identifiant is distinct from old.identifiant then
    new.identifiant := normaliser_identifiant(new.identifiant);

    -- Un compte sans nom de connexion ne peut plus se connecter autrement que
    -- par son adresse — et un enfant n'en a pas. Le vide se refuse.
    if new.identifiant is null then
      raise exception 'Il faut un identifiant' using errcode = '23514';
    end if;

    if new.identifiant is distinct from old.identifiant then
      insert into identifiants_rendus (ancien, profil_id)
      values (old.identifiant, old.id);
    end if;
  end if;

  return new;
end; $$;

-- =============================================================================
-- 5. L'ENFANT AUSSI CHOISIT SON NOM DE CONNEXION
-- =============================================================================

/**
 * Crée le compte d'un enfant venu seul, avec le nom qu'il a choisi.
 *
 * C'est pour lui que ce choix compte le plus. Il n'a pas d'adresse — c'est
 * voulu — donc ce nom est la SEULE chose avec quoi il se connecte. Le lui
 * fabriquer, c'est lui demander de retenir « alain nkoulou 2 », qu'il n'a pas
 * écrit et qu'il ne reconnaîtra pas dans six mois.
 *
 * La disponibilité est vérifiée AVANT d'incrémenter le compteur horaire : un
 * nom déjà pris n'est pas une tentative d'inscription, et ne doit pas consommer
 * le quota de quelqu'un d'autre.
 *
 * Le nom reste facultatif : sans lui, on en fabrique un depuis le prénom,
 * comme avant. L'ancienne signature disparaît, pour qu'aucun appel oublié ne
 * continue de passer à côté du choix.
 */
drop function if exists creer_compte_enfant_seul(text, text, text);

create or replace function creer_compte_enfant_seul(
  prenom_eleve text,
  nom_eleve text,
  mot_de_passe text,
  identifiant_choisi text default null
)
returns table (id uuid, identifiant text)
language plpgsql
security definer
-- `extensions` en plus de `public` : `crypt` et `gen_salt` viennent de
-- pgcrypto, qui vit là chez Supabase.
set search_path = public, extensions
as $$
declare
  nouvel_id uuid := gen_random_uuid();
  ident text;
  courriel text;
  cette_heure timestamptz := date_trunc('hour', now());
  plafond int;
  deja int;
begin
  if not coalesce((select (valeur #>> '{}')::boolean from parametres
                    where cle = 'inscriptions_ouvertes'), true) then
    raise exception 'Les inscriptions sont fermées pour le moment'
      using errcode = '42501';
  end if;

  if length(coalesce(trim(prenom_eleve), '')) < 2 then
    raise exception 'Écris ton prénom';
  end if;

  -- Court, parce qu'un enfant doit pouvoir le taper seul ; mais pas vide.
  if length(coalesce(mot_de_passe, '')) < 6 then
    raise exception 'Ton mot de passe doit faire au moins 6 caractères';
  end if;

  ident := normaliser_identifiant(identifiant_choisi);

  if ident is not null
     and exists (select 1 from profils where lower(identifiant) = ident) then
    raise exception 'Cet identifiant est déjà utilisé' using errcode = '23505';
  end if;

  if ident is null then
    ident := identifiant_depuis_nom(prenom_eleve, nom_eleve);
  end if;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'inscriptions_enfant_par_heure'), 30)
    into plafond;

  insert into creations_anonymes (heure, combien) values (cette_heure, 0)
  on conflict (heure) do nothing;

  -- `for update` sérialise : deux demandes simultanées ne peuvent pas lire le
  -- même compteur et passer toutes les deux.
  select combien into deja from creations_anonymes
   where heure = cette_heure for update;

  if deja >= plafond then
    raise exception 'Trop d''inscriptions en ce moment. Réessaie dans un moment.'
      using errcode = '53400';
  end if;

  update creations_anonymes set combien = combien + 1 where heure = cette_heure;

  courriel := 'eleve-' || replace(nouvel_id::text, '-', '') || '@eleves.tutela.cm';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change,
    phone_change_token, reauthentication_token)
  values (
    '00000000-0000-0000-0000-000000000000', nouvel_id, 'authenticated',
    'authenticated', courriel, crypt(mot_de_passe, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'eleve', 'prenom', trim(prenom_eleve),
                       'nom', nullif(trim(coalesce(nom_eleve, '')), ''),
                       'identifiant', ident),
    now(), now(), '', '', '', '', '', '', '', '');

  insert into auth.identities
    (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (nouvel_id::text, nouvel_id,
    jsonb_build_object('sub', nouvel_id::text, 'email', courriel,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  -- Aucun `liens_familiaux` : c'est toute la différence. L'enfant est seul,
  -- et l'administration le verra comme tel.
  return query select nouvel_id, ident;
end; $$;

revoke all on function creer_compte_enfant_seul(text, text, text, text) from public;
grant execute on function creer_compte_enfant_seul(text, text, text, text)
  to anon, authenticated;

commit;
