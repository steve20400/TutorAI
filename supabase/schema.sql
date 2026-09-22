-- =============================================================================
-- Schéma de base — TutorAI
-- À exécuter dans l'éditeur SQL de Supabase.
--
-- Principes tenus dans ce schéma (voir SPEC_APPLICATION.md §6) :
--   1. Le contenu protégé (photos de manuels) N'EST PAS stocké ici. Il transite,
--      il ne s'accumule pas. Aucune table ne le reçoit — c'est volontaire.
--   2. Les données d'élèves sont celles de MINEURS. La RLS est obligatoire,
--      pas optionnelle : sans elle, n'importe quel jeton client lit tout.
--   3. Les tables des v3/v4 (tuteurs humains, contrats, signalements) sont
--      créées dès maintenant, vides, pour que l'ajout ultérieur soit indolore.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. TYPES
-- =============================================================================

create type role_utilisateur as enum ('eleve', 'parent', 'repetiteur', 'admin');
create type statut_seance    as enum ('en_cours', 'terminee', 'abandonnee');
create type auteur_message   as enum ('eleve', 'tuteur');
create type mode_seance      as enum ('texte', 'audio');

-- =============================================================================
-- 2. PROFILS ET FAMILLES
-- =============================================================================

create table profils (
  id          uuid primary key references auth.users on delete cascade,
  role        role_utilisateur not null,
  prenom      text not null,
  nom         text,
  telephone   text,
  -- Nom d'utilisateur. Sert à l'administration, qui se connecte par
  -- identifiant plutôt que par email.
  identifiant text unique,
  pays        text not null default 'CM',
  cree_le     timestamptz not null default now()
);

-- Un parent peut rattacher plusieurs enfants ; un élève peut avoir deux parents.
create table liens_familiaux (
  parent_id uuid not null references profils(id) on delete cascade,
  eleve_id  uuid not null references profils(id) on delete cascade,
  cree_le   timestamptz not null default now(),
  primary key (parent_id, eleve_id)
);

create index on liens_familiaux (eleve_id);

-- =============================================================================
-- 3. PROGRAMMES OFFICIELS
--
-- Document public ministériel : indexable et redistribuable. C'est la donnée
-- qui distingue ce produit d'un ChatGPT générique.
-- =============================================================================

create table programmes (
  id            uuid primary key default gen_random_uuid(),
  pays          text not null,
  sous_systeme  text not null default 'francophone',   -- Cameroun : francophone | anglophone
  niveau        text not null,                          -- 'Terminale D'
  matiere       text not null,                          -- 'Mathématiques'
  version       text not null default '1',
  contenu       jsonb not null,                         -- le JSON structuré du programme
  publie        boolean not null default false,
  cree_le       timestamptz not null default now(),
  unique (pays, sous_systeme, niveau, matiere, version)
);

-- =============================================================================
-- 4. TUTEURS IA (mode 2)
-- =============================================================================

create table tuteurs_ia (
  id           uuid primary key default gen_random_uuid(),
  eleve_id     uuid not null references profils(id) on delete cascade,
  programme_id uuid not null references programmes(id) on delete restrict,
  matiere      text not null,
  niveau       text not null,
  manuels      jsonb not null default '[]'::jsonb,  -- titres seulement, jamais le contenu
  cree_le      timestamptz not null default now()
);

create index on tuteurs_ia (eleve_id);

-- Mémoire de l'élève : le vrai actif du produit.
create table memoire_eleve (
  tuteur_id           uuid primary key references tuteurs_ia(id) on delete cascade,
  notions_acquises    jsonb not null default '[]'::jsonb,
  notions_fragiles    jsonb not null default '[]'::jsonb,
  erreurs_recurrentes jsonb not null default '[]'::jsonb,
  maj_le              timestamptz not null default now()
);

create table seances (
  id            uuid primary key default gen_random_uuid(),
  tuteur_id     uuid not null references tuteurs_ia(id) on delete cascade,
  lecon_id      text,          -- ex. 'L1.1', repris du programme officiel
  lecon_titre   text,
  statut        statut_seance not null default 'en_cours',
  mode          mode_seance   not null default 'texte',
  resume        text,
  demarree_le   timestamptz not null default now(),
  terminee_le   timestamptz
);

create index on seances (tuteur_id, demarree_le desc);

create table messages (
  id         bigserial primary key,
  seance_id  uuid not null references seances(id) on delete cascade,
  auteur     auteur_message not null,
  contenu    text not null,
  palier     smallint,        -- palier 0..4 atteint (voir prompt-tuteur.md §3)
  cree_le    timestamptz not null default now()
);

create index on messages (seance_id, id);

-- Failles trouvées par les élèves : alimente l'amélioration du prompt.
-- Codes C1..C10, voir GRILLE_TEST_ELEVES.md §4.
create table incidents_tuteur (
  id        bigserial primary key,
  seance_id uuid references seances(id) on delete set null,
  code      text not null,
  extrait   text,
  traite    boolean not null default false,
  cree_le   timestamptz not null default now()
);

-- =============================================================================
-- 5. TABLES PRÉPARÉES POUR LES V3/V4 (vides en v1)
--
-- Le paiement est hors périmètre (SPEC_APPLICATION.md §8), mais `contrats` et
-- `seances_humaines` portent déjà un statut de règlement renseigné à la main.
-- =============================================================================

create type statut_verification as enum
  ('brouillon', 'en_attente', 'verifie', 'refuse');

-- « Répétiteur » désigne l'humain ; « tuteur » désigne l'IA. C'est le mot
-- employé au Cameroun, et la distinction évite que parents et élèves
-- confondent les deux offres.
create table repetiteurs (
  id                  uuid primary key references profils(id) on delete cascade,
  bio                 text,
  ville               text,
  matieres            text[] not null default '{}',
  niveaux             text[] not null default '{}',
  tarif_mensuel       integer,                    -- en FCFA
  annees_experience   smallint,
  disponibilites_texte text,                     -- « en semaine après 17h, samedi matin »
  disponibilites      jsonb not null default '{}'::jsonb,  -- créneaux structurés, v5
  photo_url           text,
  statut              statut_verification not null default 'brouillon',
  verifie_le          timestamptz,
  motif_refus         text,
  cree_le             timestamptz not null default now(),
  maj_le              timestamptz not null default now()
);

create index on repetiteurs (statut);

create table contrats (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid not null references profils(id) on delete cascade,
  eleve_id     uuid not null references profils(id) on delete cascade,
  repetiteur_id uuid not null references repetiteurs(id) on delete restrict,
  matiere      text not null,
  tarif        integer,
  frequence    text,
  demarre_le   date,
  termine_le   date,
  regle        boolean not null default false,     -- renseigné à la main tant qu'il n'y a pas de paiement
  cree_le      timestamptz not null default now()
);

create table seances_humaines (
  id             uuid primary key default gen_random_uuid(),
  contrat_id     uuid not null references contrats(id) on delete cascade,
  lecon_id       text,
  demarree_le    timestamptz,
  terminee_le    timestamptz,
  enregistrement_url text,        -- accès journalisé, jamais public
  compte_rendu   jsonb,
  regle          boolean not null default false
);

create table signalements (
  id           uuid primary key default gen_random_uuid(),
  auteur_id    uuid references profils(id) on delete set null,
  seance_id    uuid references seances_humaines(id) on delete set null,
  motif        text not null,
  statut       text not null default 'nouveau',
  traite_par   uuid references profils(id) on delete set null,
  traite_le    timestamptz,
  decision     text,
  cree_le      timestamptz not null default now()
);

-- Toute action d'administration est journalisée. Sans exception.
-- L'accès à un enregistrement exige un motif écrit (SPEC_APPLICATION.md §7.3).
create table journal_admin (
  id         bigserial primary key,
  admin_id   uuid not null references profils(id) on delete restrict,
  action     text not null,
  cible_type text,
  cible_id   text,
  motif      text,
  cree_le    timestamptz not null default now()
);

-- =============================================================================
-- 5 bis. PARAMÈTRES DE L'APPLICATION
--
-- Ce que l'administrateur règle sans toucher au code ni redéployer.
--
-- Les modules coûteux (IA, paiement, enregistrement vidéo) naissent ÉTEINTS.
-- Tant qu'un interrupteur est à false, l'écran correspondant n'apparaît pas et
-- l'action côté serveur est refusée — les deux, pas seulement le premier :
-- masquer un bouton n'a jamais empêché personne d'appeler la route derrière.
-- =============================================================================

create table parametres (
  cle      text primary key,
  valeur   jsonb not null,
  libelle  text not null,
  maj_le   timestamptz not null default now(),
  maj_par  uuid references profils(id) on delete set null
);

insert into parametres (cle, valeur, libelle) values
  ('ia_active',       'false'::jsonb,   'Tuteur IA proposé aux élèves'),
  ('paiement_actif',  'false'::jsonb,   'Paiement mobile money activé'),
  ('enregistrement_actif', 'false'::jsonb, 'Enregistrement des séances de cours'),
  ('resolution_video', '"480p"'::jsonb, 'Résolution des séances enregistrées'),
  ('inscriptions_ouvertes', 'true'::jsonb, 'Nouvelles inscriptions autorisées');

-- =============================================================================
-- 6. FONCTIONS D'AIDE POUR LA RLS
-- =============================================================================

create or replace function est_mon_enfant(cible uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from liens_familiaux
    where parent_id = auth.uid() and eleve_id = cible
  );
$$;

create or replace function est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profils where id = auth.uid() and role = 'admin'
  );
$$;

-- Propriétaire (élève) d'un tuteur IA donné.
create or replace function eleve_du_tuteur(t uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select eleve_id from tuteurs_ia where id = t;
$$;

-- =============================================================================
-- 7. RLS
--
-- Activée sur TOUTES les tables. Une table sans politique est fermée par défaut,
-- ce qui est le comportement voulu pour les tables des versions ultérieures.
-- =============================================================================

alter table profils           enable row level security;
alter table liens_familiaux   enable row level security;
alter table programmes        enable row level security;
alter table tuteurs_ia        enable row level security;
alter table memoire_eleve     enable row level security;
alter table seances           enable row level security;
alter table messages          enable row level security;
alter table incidents_tuteur  enable row level security;
alter table repetiteurs       enable row level security;
alter table contrats          enable row level security;
alter table seances_humaines  enable row level security;
alter table signalements      enable row level security;
alter table journal_admin     enable row level security;
alter table parametres        enable row level security;

-- --- profils ---
create policy "lire son profil" on profils
  for select using (id = auth.uid() or est_mon_enfant(id) or est_admin());

create policy "creer son profil" on profils
  for insert with check (id = auth.uid());

create policy "modifier son profil" on profils
  for update using (id = auth.uid());

-- --- liens familiaux ---
create policy "lire ses liens" on liens_familiaux
  for select using (parent_id = auth.uid() or eleve_id = auth.uid() or est_admin());

create policy "creer un lien en tant que parent" on liens_familiaux
  for insert with check (parent_id = auth.uid());

-- --- programmes : lecture ouverte à tout compte connecté ---
create policy "lire les programmes publies" on programmes
  for select using (publie or est_admin());

-- --- tuteurs IA ---
create policy "lire ses tuteurs" on tuteurs_ia
  for select using (eleve_id = auth.uid() or est_mon_enfant(eleve_id) or est_admin());

create policy "creer son tuteur" on tuteurs_ia
  for insert with check (eleve_id = auth.uid());

create policy "modifier son tuteur" on tuteurs_ia
  for update using (eleve_id = auth.uid());

create policy "supprimer son tuteur" on tuteurs_ia
  for delete using (eleve_id = auth.uid());

-- --- mémoire de l'élève ---
create policy "lire sa memoire" on memoire_eleve
  for select using (
    eleve_du_tuteur(tuteur_id) = auth.uid()
    or est_mon_enfant(eleve_du_tuteur(tuteur_id))
    or est_admin()
  );

create policy "ecrire sa memoire" on memoire_eleve
  for all using (eleve_du_tuteur(tuteur_id) = auth.uid())
  with check (eleve_du_tuteur(tuteur_id) = auth.uid());

-- --- séances ---
create policy "lire ses seances" on seances
  for select using (
    eleve_du_tuteur(tuteur_id) = auth.uid()
    or est_mon_enfant(eleve_du_tuteur(tuteur_id))
    or est_admin()
  );

create policy "ecrire ses seances" on seances
  for all using (eleve_du_tuteur(tuteur_id) = auth.uid())
  with check (eleve_du_tuteur(tuteur_id) = auth.uid());

-- --- messages ---
create policy "lire ses messages" on messages
  for select using (
    exists (
      select 1 from seances s
      where s.id = messages.seance_id
        and (
          eleve_du_tuteur(s.tuteur_id) = auth.uid()
          or est_mon_enfant(eleve_du_tuteur(s.tuteur_id))
          or est_admin()
        )
    )
  );

create policy "ecrire ses messages" on messages
  for insert with check (
    exists (
      select 1 from seances s
      where s.id = messages.seance_id
        and eleve_du_tuteur(s.tuteur_id) = auth.uid()
    )
  );

-- --- incidents : réservés à l'administration ---
create policy "admin lit les incidents" on incidents_tuteur
  for select using (est_admin());

-- --- paramètres ---
-- Tout le monde lit : l'application doit savoir quels modules sont allumés.
-- Seule l'administration écrit.
create policy "tout le monde lit les parametres" on parametres
  for select using (true);

create policy "seule l'administration modifie les parametres" on parametres
  for update using (est_admin()) with check (est_admin());

-- --- journal d'administration : lecture admin, écriture serveur uniquement ---
create policy "admin lit le journal" on journal_admin
  for select using (est_admin());

-- --- répétiteurs ---
-- Le répétiteur gère son propre profil.
create policy "le repetiteur lit son profil" on repetiteurs
  for select using (id = auth.uid() or est_admin());

create policy "le repetiteur cree son profil" on repetiteurs
  for insert with check (id = auth.uid());

create policy "le repetiteur modifie son profil" on repetiteurs
  for update using (id = auth.uid());

-- Et surtout : un profil n'est visible des familles QUE s'il est vérifié.
-- Cette règle est ici, dans la base, et pas seulement dans la requête de
-- l'annuaire. Un oubli de `where statut = 'verifie'` côté application
-- exposerait sinon des répétiteurs non contrôlés à des parents — exactement
-- ce que le produit promet d'empêcher.
create policy "les familles voient les repetiteurs verifies" on repetiteurs
  for select using (statut = 'verifie');

-- Les tables contrats / seances_humaines / signalements restent sans
-- politique : fermées jusqu'aux v3/v4.

-- =============================================================================
-- 8. CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
-- =============================================================================

create or replace function gerer_nouvel_utilisateur()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  role_demande text := coalesce(new.raw_user_meta_data ->> 'role', 'eleve');
begin
  -- `raw_user_meta_data` vient du client. N'importe qui peut appeler
  -- supabase.auth.signUp({options: {data: {role: 'admin'}}}) depuis un
  -- navigateur avec la clé publique — elle est publique, c'est son rôle.
  -- Faire confiance à ce champ donnerait les pleins pouvoirs à qui le demande.
  -- Tout rôle non prevu retombe sur 'eleve'. Un administrateur ne se cree
  -- qu'en SQL, jamais par inscription.
  if role_demande not in ('eleve', 'parent', 'repetiteur') then
    role_demande := 'eleve';
  end if;

  insert into profils (id, role, prenom, nom, telephone, identifiant, pays)
  values (
    new.id,
    role_demande::role_utilisateur,
    coalesce(new.raw_user_meta_data ->> 'prenom', 'Élève'),
    nullif(new.raw_user_meta_data ->> 'nom', ''),
    nullif(new.raw_user_meta_data ->> 'telephone', ''),
    nullif(new.raw_user_meta_data ->> 'identifiant', ''),
    coalesce(new.raw_user_meta_data ->> 'pays', 'CM')
  );

  -- Un répétiteur a besoin d'une fiche dès l'inscription, même vide : sans
  -- elle, sa première visite au formulaire de profil n'aurait rien à modifier.
  -- Elle naît en 'brouillon', donc invisible des familles.
  if role_demande = 'repetiteur' then
    insert into repetiteurs (id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger sur_nouvel_utilisateur
  after insert on auth.users
  for each row execute function gerer_nouvel_utilisateur();


-- =============================================================================
-- 9. CONNEXION PAR IDENTIFIANT
--
-- L'administration se connecte avec « GALILEE », pas avec une adresse email.
-- Supabase Auth ne connaît que les emails : cette fonction fait le pont.
--
-- security definer, car un visiteur non connecté ne peut pas lire `profils` —
-- et c'est justement avant d'être connecté qu'il a besoin de cette résolution.
-- Elle ne révèle rien : sans le mot de passe, connaître l'email ne sert à rien.
-- =============================================================================

create or replace function email_par_identifiant(saisie text)
returns text language sql stable security definer set search_path = public, auth as $$
  select u.email
  from profils p
  join auth.users u on u.id = p.id
  where upper(p.identifiant) = upper(trim(saisie))
  limit 1;
$$;

revoke all on function email_par_identifiant(text) from public;
grant execute on function email_par_identifiant(text) to anon, authenticated;
