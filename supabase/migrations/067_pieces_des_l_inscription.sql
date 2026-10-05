-- Les pièces se déposent à l'inscription, et les diplômes vont par plusieurs.
--
-- Ce que nous vendons, c'est un répétiteur VÉRIFIÉ. Or l'inscription ne
-- demandait aucune pièce : on saisissait un prénom, une adresse, un mot de
-- passe, et un dossier apparaissait dans l'espace d'administration — avec
-- strictement rien à vérifier. L'administration pouvait l'accepter, et la
-- promesse du produit se vidait de son contenu : « une personne lambda, rien
-- ne prouve que ce qu'elle a écrit est vrai ».
--
-- Le dépôt existait pourtant, depuis la migration 063 — mais APRÈS la
-- connexion, donc après l'inscription, donc après le moment où quelqu'un
-- aurait pu renoncer. Il fallait le remonter au début.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA DIFFICULTÉ, ET POURQUOI CE DÉTOUR
--
-- Au moment où l'on dépose, le compte n'existe pas encore. Il n'y a donc ni
-- `auth.uid()`, ni dossier à son nom dans le seau, ni ligne `repetiteurs` à
-- rattacher. Tout ce sur quoi la migration 063 s'appuyait est absent.
--
-- D'où un dépôt PROVISOIRE, désigné par un jeton tiré au sort. Le navigateur
-- l'ouvre, téléverse sous `depots/<jeton>/`, et déclare ce qu'il a déposé. Le
-- jeton voyage ensuite dans les métadonnées de l'inscription, et c'est le
-- déclencheur `gerer_nouvel_utilisateur` — celui-là même qui crée la fiche —
-- qui rattache les fichiers au répétiteur qui vient de naître.
--
-- Rattacher par le déclencheur plutôt que par un appel de l'application :
-- aucune route anonyme ne peut dire « attache ce dépôt à ce compte », donc
-- personne ne peut glisser ses fichiers dans le dossier d'un autre.
--
-- Ce que le dépôt provisoire ouvre, et ce qui le borne : n'importe qui peut
-- écrire dans le seau sans compte. C'est le prix à payer pour qu'un
-- répétiteur dépose avant d'exister. Les garde-fous sont donc dans cette
-- migration et nulle part ailleurs — plafond horaire sur l'ouverture, durée
-- de vie courte, six fichiers au plus par jeton, et purge de ce qui n'a
-- jamais été rattaché.
--
-- ─────────────────────────────────────────────────────────────────────────
-- PLUSIEURS DIPLÔMES
--
-- `unique (repetiteur_id, type_cle)` n'autorisait qu'une pièce par type. Une
-- carte d'identité, oui. Un casier, oui. Mais quelqu'un peut avoir une licence
-- ET un master, l'un photographié, l'autre en PDF. La contrainte devient donc
-- un déclencheur, qui lit `types_pieces.multiple` — la règle vit avec le type,
-- pas dans un index qui l'ignorerait.

begin;

-- =============================================================================
-- 1. QUELS TYPES VONT PAR PLUSIEURS
-- =============================================================================

alter table types_pieces
  add column if not exists multiple boolean not null default false;

comment on column types_pieces.multiple is
  'Ce type accepte plusieurs pièces par répétiteur. Un diplôme, oui ; une carte d''identité, non.';

update types_pieces set multiple = true where cle = 'diplome';

-- La contrainte d'unicité s'en va, remplacée par un déclencheur qui sait lire
-- `multiple`. Un index partiel ne pourrait pas : il n'a pas le droit de
-- joindre une autre table, donc il figerait la liste des types.
alter table pieces_justificatives
  drop constraint if exists pieces_justificatives_repetiteur_id_type_cle_key;

create or replace function une_seule_piece_par_type_simple()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from types_pieces t
     where t.cle = new.type_cle and t.multiple
  ) then
    return new;
  end if;

  if exists (
    select 1 from pieces_justificatives p
     where p.repetiteur_id = new.repetiteur_id
       and p.type_cle = new.type_cle
       and p.id <> new.id
  ) then
    raise exception 'Une seule pièce de ce type : remplacez celle qui existe'
      using errcode = '23505';
  end if;

  return new;
end; $$;

drop trigger if exists sur_depot_piece on pieces_justificatives;
create trigger sur_depot_piece
  before insert or update on pieces_justificatives
  for each row execute function une_seule_piece_par_type_simple();

-- =============================================================================
-- 2. LE DÉPÔT PROVISOIRE
-- =============================================================================

create table if not exists depots_inscription (
  jeton      uuid primary key default gen_random_uuid(),
  cree_le    timestamptz not null default now(),
  -- Deux heures : largement assez pour remplir un formulaire et photographier
  -- trois documents, assez court pour qu'un jeton volé ne serve à rien demain.
  expire_le  timestamptz not null default now() + interval '2 hours',
  -- Rempli par le déclencheur d'inscription. Tant qu'il est nul, le dépôt
  -- n'appartient à personne et sera purgé.
  rattache_a uuid references repetiteurs(id) on delete cascade,
  rattache_le timestamptz
);

create table if not exists depots_fichiers (
  id        uuid primary key default gen_random_uuid(),
  jeton     uuid not null references depots_inscription(jeton) on delete cascade,
  type_cle  text not null references types_pieces(cle) on delete restrict,
  chemin    text not null,
  depose_le timestamptz not null default now()
);

create index if not exists depots_fichiers_jeton on depots_fichiers (jeton);
create index if not exists depots_inscription_purge
  on depots_inscription (expire_le) where rattache_a is null;

alter table depots_inscription enable row level security;
alter table depots_fichiers enable row level security;
-- Aucune politique, donc aucune lecture ni écriture directe : tout passe par
-- les fonctions ci-dessous, qui vérifient elles-mêmes ce qu'elles font.

-- =============================================================================
-- 3. OUVRIR UN DÉPÔT
-- =============================================================================

/**
 * Tire un jeton de dépôt.
 *
 * Plafond horaire, comme pour la création d'un compte d'enfant venu seul et
 * pour la même raison : c'est l'une des deux seules portes du produit qu'un
 * visiteur anonyme peut pousser, et une porte sans compteur finit par servir
 * à remplir le seau de quelqu'un d'autre.
 *
 * Le verrou consultatif est pris AVANT de compter : sans lui, deux demandes
 * simultanées lisent le même total et passent toutes les deux.
 */
create or replace function ouvrir_depot()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ouverts integer;
  nouveau uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ouvrir_depot'));

  select count(*) into ouverts
    from depots_inscription
   where cree_le > now() - interval '1 hour';

  if ouverts >= 60 then
    raise exception 'Trop de dépôts ouverts dans l''heure. Réessayez dans un moment.'
      using errcode = '53400';
  end if;

  insert into depots_inscription default values returning jeton into nouveau;
  return nouveau;
end; $$;

/**
 * Ce jeton peut-il encore recevoir un fichier ?
 *
 * Lue par la politique de stockage, donc à chaque téléversement. `stable` et
 * non `volatile` : elle ne change rien, et PostgreSQL peut la mémoriser le
 * temps de la requête.
 *
 * Six fichiers : une carte, un casier, et quatre diplômes. Au-delà, ce n'est
 * plus un dossier, c'est un entrepôt.
 */
create or replace function depot_valide(le_jeton uuid)
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
       and d.expire_le > now()
  )
  and (select count(*) from depots_fichiers f where f.jeton = le_jeton) < 6;
$$;

/**
 * Inscrit un fichier déposé sous un jeton.
 *
 * Le fichier est déjà dans le seau — la politique de stockage l'y a laissé
 * entrer. Cette fonction ne fait qu'en garder la trace, et refait les mêmes
 * vérifications : entre le téléversement et cette ligne, le jeton a pu
 * expirer ou être rattaché.
 *
 * Le chemin est vérifié : il doit commencer par `depots/<jeton>/`. Sans cela
 * on pourrait déclarer le fichier d'un autre et se l'approprier au
 * rattachement.
 */
create or replace function declarer_fichier_depose(
  le_jeton uuid,
  type_piece text,
  chemin_fichier text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not depot_valide(le_jeton) then
    raise exception 'Ce dépôt n''est plus ouvert' using errcode = '42501';
  end if;

  if not exists (select 1 from types_pieces where cle = type_piece) then
    raise exception 'Type de pièce inconnu' using errcode = '22023';
  end if;

  if chemin_fichier not like 'depots/' || le_jeton::text || '/%' then
    raise exception 'Chemin hors du dépôt' using errcode = '42501';
  end if;

  -- Un type simple se REMPLACE, il ne s'ajoute pas. On reprend la photo de sa
  -- carte d'identité parce que la première était floue, et c'est le cas
  -- courant. Sans cette distinction, le dépôt porterait deux cartes, le
  -- rattachement en insérerait deux, le déclencheur d'unicité refuserait la
  -- seconde — et l'inscription entière échouerait, à l'instant où la personne
  -- valide son compte.
  if exists (select 1 from types_pieces where cle = type_piece and multiple) then
    insert into depots_fichiers (jeton, type_cle, chemin)
    values (le_jeton, type_piece, chemin_fichier);
    return;
  end if;

  update depots_fichiers
     set chemin = chemin_fichier, depose_le = now()
   where jeton = le_jeton and type_cle = type_piece;

  if not found then
    insert into depots_fichiers (jeton, type_cle, chemin)
    values (le_jeton, type_piece, chemin_fichier);
  end if;
end; $$;

/**
 * Ce dépôt porte-t-il une pièce de ce type ?
 *
 * Elle existe pour que le serveur puisse refuser une inscription sans carte
 * d'identité en le SACHANT, plutôt qu'en croyant un champ caché que le
 * navigateur remplit — donc que n'importe qui peut remplir. La question est
 * fermée et la réponse est un booléen : elle ne dit rien de ce qu'il y a
 * dedans, ni à qui c'est.
 */
create or replace function depot_porte(le_jeton uuid, type_piece text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from depots_fichiers f
     where f.jeton = le_jeton and f.type_cle = type_piece
  );
$$;

revoke all on function ouvrir_depot() from public;
revoke all on function declarer_fichier_depose(uuid, text, text) from public;
revoke all on function depot_porte(uuid, text) from public;
grant execute on function depot_porte(uuid, text) to anon, authenticated;
grant execute on function ouvrir_depot() to anon, authenticated;
grant execute on function depot_valide(uuid) to anon, authenticated;
grant execute on function declarer_fichier_depose(uuid, text, text)
  to anon, authenticated;

-- =============================================================================
-- 4. LE SEAU S'OUVRE AUX DÉPÔTS PROVISOIRES
-- =============================================================================

-- Écriture seulement, sous `depots/<jeton>/`, et seulement tant que le jeton
-- vaut quelque chose. Aucune lecture : ce qu'on dépose ici, on ne le relit
-- pas — même règle que pour un répétiteur connecté (migration 020), et pour
-- la même raison. Aucune suppression non plus, par personne.
drop policy if exists "un depot d'inscription ecrit sous son jeton"
  on storage.objects;
create policy "un depot d'inscription ecrit sous son jeton" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'pieces'
    and (storage.foldername(name))[1] = 'depots'
    and array_length(storage.foldername(name), 1) = 2
    and depot_valide(((storage.foldername(name))[2])::uuid)
  );

-- =============================================================================
-- 5. LE RATTACHEMENT, À LA NAISSANCE DU COMPTE
-- =============================================================================

/**
 * Le déclencheur d'inscription, qui rattache en plus le dépôt.
 *
 * Le jeton arrive par `raw_user_meta_data`, comme le prénom et le rôle. Il
 * n'est pas plus digne de confiance qu'eux — c'est le navigateur qui l'écrit —
 * mais il ne donne aucun pouvoir : au pire, quelqu'un rattache à son propre
 * compte des fichiers qu'il a lui-même déposés, ce qui est exactement l'usage
 * prévu. Et un jeton déjà rattaché ne l'est pas deux fois.
 *
 * Les fichiers ne bougent pas dans le seau. Les déplacer demanderait de les
 * relire et de les réécrire pour n'y gagner qu'un chemin plus joli, alors que
 * l'administration les ouvre par URL signée et ne lit jamais le chemin.
 */
create or replace function gerer_nouvel_utilisateur()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  role_demande text := coalesce(new.raw_user_meta_data ->> 'role', 'eleve');
  jeton_depot uuid;
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

    -- Les pièces déposées avant que ce compte n'existe.
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
-- 6. LA PURGE
-- =============================================================================

/**
 * Efface les dépôts que personne n'a jamais rattachés.
 *
 * Quelqu'un dépose trois documents, puis ferme l'onglet sans s'inscrire. Ses
 * fichiers restent dans le seau — des cartes d'identité, rattachées à
 * personne, que personne ne viendra jamais chercher. Les garder serait garder
 * des pièces d'identité sans dossier ni consentement.
 *
 * Les lignes partent ici ; les objets du seau sont rendus par la fonction,
 * pour que l'appelant les efface — SQL n'a pas la main dessus.
 *
 * À appeler par une tâche planifiée. Sans planificateur, l'administration
 * peut l'exécuter à la main : c'est écrit dans le fichier, pas dans une tête.
 */
create or replace function purger_depots_abandonnes()
returns table (chemin text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with perimes as (
    delete from depots_inscription d
     where d.rattache_a is null
       and d.expire_le < now() - interval '24 hours'
    returning d.jeton
  )
  select f.chemin from depots_fichiers f join perimes p on p.jeton = f.jeton;
end; $$;

revoke all on function purger_depots_abandonnes() from public, anon, authenticated;

-- =============================================================================
-- 7. LIRE SES PIÈCES, MAINTENANT QU'IL PEUT Y EN AVOIR PLUSIEURS
-- =============================================================================

/**
 * Les pièces d'un répétiteur, une ligne par pièce déposée.
 *
 * Elle rendait une ligne par TYPE, ce qui ne tient plus : un répétiteur peut
 * avoir trois diplômes. Un type jamais déposé garde sa ligne, à vide — c'est
 * elle qui dit ce qu'on attend encore de lui, et une absence de ligne ne dit
 * rien.
 *
 * `id` apparaît pour que l'écran puisse distinguer deux diplômes et parler de
 * l'un sans parler de l'autre.
 */
drop function if exists mes_pieces();
create or replace function mes_pieces()
returns table (
  id uuid,
  cle text,
  libelle_fr text,
  libelle_en text,
  requise boolean,
  multiple boolean,
  statut statut_piece,
  motif text,
  deposee_le timestamptz,
  examinee_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select j.id, t.cle, t.libelle_fr, t.libelle_en, t.requise, t.multiple,
         j.statut, j.motif, j.deposee_le, j.examinee_le
    from types_pieces t
    left join pieces_justificatives j
      on j.type_cle = t.cle and j.repetiteur_id = auth.uid()
   where auth.uid() is not null
   order by t.ordre, j.deposee_le;
$$;

revoke all on function mes_pieces() from public, anon;
grant execute on function mes_pieces() to authenticated;

/**
 * Déposer une pièce, une fois connecté.
 *
 * Elle s'appuyait sur `on conflict (repetiteur_id, type_cle)`, qui n'existe
 * plus. Pour un type simple on remplace la ligne en place — le verdict d'hier
 * ne vaut pas pour le fichier d'aujourd'hui. Pour un type multiple on ajoute,
 * sans toucher aux précédents.
 */
create or replace function deposer_piece(type_piece text, chemin_fichier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  etat statut_verification;
  accepte_plusieurs boolean;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  select statut into etat from repetiteurs where id = moi;

  if etat is null then
    raise exception 'Remplissez votre fiche avant de déposer une pièce'
      using errcode = '42501';
  end if;

  -- Un dossier déjà validé ne se modifie pas en silence : être contrôlé avec
  -- un document puis en substituer un autre reviendrait à rester affiché
  -- comme vérifié sur une pièce que personne n'a vue.
  if etat = 'verifie' then
    raise exception 'Votre dossier est déjà validé : écrivez à l''administration pour changer une pièce'
      using errcode = '42501';
  end if;

  select multiple into accepte_plusieurs from types_pieces where cle = type_piece;

  if accepte_plusieurs is null then
    raise exception 'Type de pièce inconnu' using errcode = '22023';
  end if;

  if accepte_plusieurs then
    insert into pieces_justificatives (repetiteur_id, type_cle, chemin)
    values (moi, type_piece, chemin_fichier);
    return;
  end if;

  update pieces_justificatives
     set chemin       = chemin_fichier,
         statut       = 'deposee',
         motif        = null,
         examinee_le  = null,
         examinee_par = null,
         deposee_le   = now()
   where repetiteur_id = moi and type_cle = type_piece;

  if not found then
    insert into pieces_justificatives (repetiteur_id, type_cle, chemin)
    values (moi, type_piece, chemin_fichier);
  end if;
end; $$;

revoke all on function deposer_piece(text, text) from public, anon;
grant execute on function deposer_piece(text, text) to authenticated;

-- =============================================================================
-- 8. CE QUE LA FAMILLE LIT, QUAND IL Y A TROIS DIPLÔMES
-- =============================================================================

/**
 * Les pièces contrôlées d'un dossier public, UNE LIGNE PAR TYPE.
 *
 * Elle en rendait une par pièce. Avec trois diplômes, le dossier affichait
 * trois fois « Diplôme », ce qui ne dit rien de plus et se lit comme une
 * erreur. Une famille veut savoir que les diplômes ont été contrôlés, pas
 * combien il y en a.
 *
 * La date retenue est la plus récente : c'est la dernière fois que quelqu'un
 * a regardé.
 */
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
  select t.cle, t.libelle_fr, t.libelle_en, max(j.examinee_le)
    from pieces_justificatives j
    join types_pieces t on t.cle = j.type_cle
    join repetiteurs r on r.id = j.repetiteur_id
   where j.repetiteur_id = rid
     and j.statut = 'lisible'
     and r.statut = 'verifie'
   group by t.cle, t.libelle_fr, t.libelle_en, t.ordre
   order by t.ordre;
$$;

revoke all on function pieces_controlees(uuid) from public;
grant execute on function pieces_controlees(uuid) to anon, authenticated;

commit;
