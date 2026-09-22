-- =============================================================================
-- Migration 001 — pièces justificatives, facturation, porte-monnaie
--
-- La base existe déjà (supabase/schema.sql a été exécuté). Ce fichier ajoute ce
-- que l'espace d'administration exige et ne touche à rien d'existant, sauf une
-- colonne ajoutée à `repetiteurs`.
--
-- À exécuter une seule fois, dans l'éditeur SQL de Supabase.
-- =============================================================================

begin;

-- =============================================================================
-- 1. PIÈCES JUSTIFICATIVES
--
-- Le répétiteur photographie ses pièces à l'inscription. Seule
-- l'administration peut les lire — ni les parents, ni les autres répétiteurs,
-- ni lui-même une fois déposées : une pièce qu'on peut relire est une pièce
-- qu'on peut remplacer après coup.
-- =============================================================================

create type statut_piece as enum ('deposee', 'lisible', 'illisible', 'refusee');

-- Quelles pièces existent, et lesquelles sont exigées. Le caractère
-- obligatoire est un RÉGLAGE, pas une constante : au lancement le casier
-- judiciaire sera facultatif, faute de quoi il n'y aurait aucun répétiteur.
create table types_pieces (
  cle         text primary key,
  libelle_fr  text not null,
  libelle_en  text not null,
  requise     boolean not null default true,
  ordre       smallint not null default 0,
  maj_le      timestamptz not null default now(),
  maj_par     uuid references profils(id) on delete set null
);

insert into types_pieces (cle, libelle_fr, libelle_en, requise, ordre) values
  ('cni',     'Carte nationale d''identité', 'National ID card',  true,  1),
  ('casier',  'Casier judiciaire',           'Police record',     false, 2),
  ('diplome', 'Diplôme',                     'Certificate',       false, 3);

create table pieces_justificatives (
  id            uuid primary key default gen_random_uuid(),
  repetiteur_id uuid not null references repetiteurs(id) on delete cascade,
  type_cle      text not null references types_pieces(cle) on delete restrict,
  -- Chemin dans le bucket privé « pieces », jamais une URL publique.
  chemin        text not null,
  statut        statut_piece not null default 'deposee',
  motif         text,
  deposee_le    timestamptz not null default now(),
  examinee_le   timestamptz,
  examinee_par  uuid references profils(id) on delete set null,
  unique (repetiteur_id, type_cle)
);

create index on pieces_justificatives (repetiteur_id);
create index on pieces_justificatives (statut);

-- =============================================================================
-- 2. FACTURATION
--
-- Ce que les répétiteurs versent à la plateforme. Une seule ligne, éditée
-- depuis l'espace d'administration.
-- =============================================================================

create type mode_facturation as enum ('par_eleve_actif', 'pourcentage_gains');

create table facturation (
  -- Table à ligne unique : la contrainte rend impossible d'en créer une seconde.
  id                    smallint primary key default 1 check (id = 1),
  mode                  mode_facturation not null default 'par_eleve_actif',
  montant_par_eleve     integer not null default 0 check (montant_par_eleve >= 0),
  pourcentage           numeric(5,2) not null default 0
                          check (pourcentage >= 0 and pourcentage <= 100),
  delai_masquage_jours  smallint not null default 15 check (delai_masquage_jours >= 0),
  -- Incrémentée à chaque changement qui modifie ce que doit un répétiteur.
  -- Un répétiteur dont `version_contrat_acceptee` est inférieure doit
  -- réaccepter avant de reparaître dans l'annuaire : on ne prélève pas sur une
  -- base qu'il n'a jamais signée.
  version_contrat       integer not null default 1,
  maj_le                timestamptz not null default now(),
  maj_par               uuid references profils(id) on delete set null
);

insert into facturation (id) values (1);

alter table repetiteurs
  add column version_contrat_acceptee integer not null default 0;

-- Les fiches qui existaient avant cette migration n'ont jamais eu de contrat à
-- accepter : on les considère à jour de la version 1. Sans cette ligne, la
-- politique écrite plus bas les ferait toutes disparaître de l'annuaire du
-- jour au lendemain, sans que personne comprenne pourquoi.
update repetiteurs set version_contrat_acceptee = 1;

-- =============================================================================
-- 3. REDEVANCES
--
-- Une ligne par répétiteur et par mois.
--
-- Le tarif est FIGÉ à la création. Si le montant était relu depuis
-- `facturation` au moment de l'affichage, changer le réglage réécrirait le
-- passé : un répétiteur qui devait 2 000 se retrouverait à devoir 2 500, et
-- les mois déjà réglés changeraient de montant. Une facture ne se réécrit pas.
-- =============================================================================

create type statut_redevance as enum ('due', 'payee', 'annulee');

create table redevances (
  id                    uuid primary key default gen_random_uuid(),
  repetiteur_id         uuid not null references repetiteurs(id) on delete cascade,
  -- Premier jour du mois facturé.
  periode               date not null,
  mode                  mode_facturation not null,
  montant_unitaire      integer not null default 0,
  pourcentage_applique  numeric(5,2),
  eleves_actifs         smallint not null default 0,
  gains_declares        integer,
  montant_total         integer not null default 0,
  statut                statut_redevance not null default 'due',
  echeance              date not null,
  payee_le              timestamptz,
  reference_paiement    text,
  cree_le               timestamptz not null default now(),
  unique (repetiteur_id, periode)
);

create index on redevances (statut, echeance);
create index on redevances (repetiteur_id);

-- =============================================================================
-- 4. PORTE-MONNAIE — écrit maintenant, éteint jusqu'à nouvel ordre
--
-- Détenir l'argent d'un tiers relève de la monnaie électronique : agrément ou
-- partenariat avec un établissement agréé. Tant que le paramètre
-- `portefeuille_actif` est à false, aucune écriture n'est possible ici — la
-- politique RLS le refuse, pas seulement l'interface.
--
-- Les tables existent dès maintenant pour qu'il n'y ait aucune décision
-- d'architecture à prendre dans l'urgence le jour où la société existera.
-- =============================================================================

create type sens_mouvement as enum
  ('depot', 'retrait', 'paiement', 'commission', 'remboursement');

create table portefeuilles (
  id      uuid primary key references profils(id) on delete cascade,
  -- Le solde ne peut jamais devenir négatif : un découvert serait un crédit,
  -- et un crédit est une autre activité réglementée.
  solde   integer not null default 0 check (solde >= 0),
  devise  text not null default 'XAF',
  cree_le timestamptz not null default now(),
  maj_le  timestamptz not null default now()
);

create table mouvements (
  id             uuid primary key default gen_random_uuid(),
  portefeuille_id uuid not null references portefeuilles(id) on delete restrict,
  sens           sens_mouvement not null,
  montant        integer not null check (montant > 0),
  solde_apres    integer not null,
  contrat_id     uuid references contrats(id) on delete set null,
  redevance_id   uuid references redevances(id) on delete set null,
  reference      text,
  cree_le        timestamptz not null default now()
);

create index on mouvements (portefeuille_id, cree_le desc);

insert into parametres (cle, valeur, libelle) values
  ('portefeuille_actif', 'false'::jsonb,
   'Porte-monnaie interne — exige une société constituée');

-- =============================================================================
-- 5. POLITIQUES RLS
--
-- Fermé par défaut : chaque table est verrouillée, puis on ouvre le strict
-- nécessaire.
-- =============================================================================

alter table types_pieces           enable row level security;
alter table pieces_justificatives  enable row level security;
alter table facturation            enable row level security;
alter table redevances             enable row level security;
alter table portefeuilles          enable row level security;
alter table mouvements             enable row level security;

-- Les types de pièces sont publics en lecture : le répétiteur doit savoir
-- quoi fournir avant même d'avoir un compte complet.
create policy "tout le monde lit les types de pieces" on types_pieces
  for select using (true);

create policy "seule l'administration modifie les types de pieces" on types_pieces
  for all using (est_admin()) with check (est_admin());

-- Le répétiteur dépose ses pièces mais ne les relit jamais : une pièce
-- relisible est une pièce qu'on peut échanger après examen.
create policy "le repetiteur depose ses pieces" on pieces_justificatives
  for insert with check (repetiteur_id = auth.uid());

create policy "l'administration lit les pieces" on pieces_justificatives
  for select using (est_admin());

create policy "l'administration statue sur les pieces" on pieces_justificatives
  for update using (est_admin()) with check (est_admin());

-- La facturation est lisible par tous les répétiteurs : ils doivent pouvoir
-- vérifier ce qu'on leur applique.
create policy "tout le monde lit la facturation" on facturation
  for select using (true);

create policy "seule l'administration modifie la facturation" on facturation
  for update using (est_admin()) with check (est_admin());

create policy "le repetiteur lit ses redevances" on redevances
  for select using (repetiteur_id = auth.uid() or est_admin());

create policy "seule l'administration ecrit les redevances" on redevances
  for all using (est_admin()) with check (est_admin());

create policy "chacun lit son portefeuille" on portefeuilles
  for select using (id = auth.uid() or est_admin());

-- Aucune écriture tant que le module est éteint. Le contrôle est ici, en base,
-- et pas seulement dans l'interface : masquer un bouton n'a jamais empêché
-- personne d'appeler la route derrière.
create policy "ecriture du portefeuille seulement si le module est actif"
  on portefeuilles for all
  using (
    est_admin()
    and (select valeur from parametres where cle = 'portefeuille_actif') = 'true'::jsonb
  )
  with check (
    est_admin()
    and (select valeur from parametres where cle = 'portefeuille_actif') = 'true'::jsonb
  );

create policy "chacun lit ses mouvements" on mouvements
  for select using (
    portefeuille_id = auth.uid() or est_admin()
  );

create policy "ecriture des mouvements seulement si le module est actif"
  on mouvements for insert
  with check (
    est_admin()
    and (select valeur from parametres where cle = 'portefeuille_actif') = 'true'::jsonb
  );

-- =============================================================================
-- 6. L'ANNUAIRE TIENT COMPTE DES IMPAYÉS
--
-- La visibilité est le seul levier de recouvrement dont dispose la plateforme,
-- puisqu'elle ne détient pas l'argent. Une fiche impayée au-delà du délai
-- sort de l'annuaire — elle n'est jamais supprimée.
-- =============================================================================

create or replace function repetiteur_a_jour(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from redevances r
    where r.repetiteur_id = cible
      and r.statut = 'due'
      and r.echeance < current_date
  );
$$;

drop policy if exists "les familles voient les repetiteurs verifies" on repetiteurs;

create policy "les familles voient les repetiteurs verifies et a jour"
  on repetiteurs for select
  using (
    statut = 'verifie'
    and repetiteur_a_jour(id)
    and version_contrat_acceptee
        >= (select version_contrat from facturation where id = 1)
  );

-- =============================================================================
-- 7. L'INSCRIPTION VAUT ACCEPTATION DES CONDITIONS EN VIGUEUR
--
-- Un répétiteur qui s'inscrit accepte la version du contrat affichée ce
-- jour-là. Sans cette ligne, toute nouvelle fiche naîtrait à la version 0 et
-- serait invisible dès sa vérification — un bug silencieux, du genre qui prend
-- une journée à trouver.
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
    insert into repetiteurs (id, version_contrat_acceptee)
    values (new.id, (select version_contrat from facturation where id = 1));
  end if;
  return new;
end;
$$;

commit;
