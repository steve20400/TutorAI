-- Se connecter avec son nom, comme l'administration le fait déjà.
--
-- Jusqu'ici l'identifiant était écrit en majuscules et les espaces devenaient
-- des tirets : « ALAIN-NKOULOU ». C'est un nom de fichier, pas un nom de
-- personne, et il ne s'invente pas — il fallait le lire quelque part avant de
-- pouvoir s'en servir.
--
-- Désormais l'identifiant est le nom, en minuscules, espaces compris :
-- « alain nkoulou ». On le tape sans l'avoir appris. La casse n'a jamais
-- compté à la connexion (`email_par_identifiant` comparait déjà en
-- majuscules), mais l'unicité, elle, était sensible à la casse : « Alain
-- Nkoulou » et « alain nkoulou » pouvaient coexister et se disputer la même
-- saisie. L'index le refuse maintenant.
--
-- Les identifiants déjà posés ne changent pas. « GALILEE » continue de
-- fonctionner, et se tape « galilee » aussi bien.

-- ── Mettre un nom en forme ──────────────────────────────────────────────────
-- Accents retirés : quelqu'un qui tape « nadege » depuis un clavier sans
-- accents doit atteindre le compte de Nadège. Apostrophe et tiret gardés,
-- ils sont dans les noms d'ici (N'Dongo, Ngo-Bell).
create or replace function normaliser_identifiant(saisie text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    trim(both ' ' from
      regexp_replace(
        regexp_replace(
          lower(unaccent_simple(coalesce(saisie, ''))),
          '[^a-z0-9''\- ]+', ' ', 'g'),
        '\s+', ' ', 'g')),
    '');
$$;

-- ── Fabriquer un identifiant libre à partir d'un nom ────────────────────────
-- Les homonymes existent : « alain nkoulou 2 » plutôt qu'un refus, parce que
-- le deuxième Alain Nkoulou ne doit pas avoir à changer de nom pour s'inscrire.
create or replace function identifiant_depuis_nom(prenom text, nom text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  essai text;
  n int := 1;
begin
  base := normaliser_identifiant(
    coalesce(trim(prenom), '') || ' ' || coalesce(trim(nom), ''));
  if base is null then base := 'compte'; end if;
  base := left(base, 40);

  essai := base;
  while exists (select 1 from profils where lower(identifiant) = essai) loop
    n := n + 1;
    essai := base || ' ' || n;
  end loop;
  return essai;
end; $$;

-- L'ancien nom reste, il est appelé par `creer_compte_eleve`.
create or replace function identifiant_eleve(prenom text, nom text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return identifiant_depuis_nom(prenom, nom);
end; $$;

-- ── Unicité insensible à la casse ───────────────────────────────────────────
-- Avant de poser l'index : deux comptes existants pourraient ne différer que
-- par la casse. Il n'y en a pas aujourd'hui, mais la migration doit le dire
-- plutôt que d'échouer avec « could not create unique index ».
do $$
declare doublon text;
begin
  select lower(identifiant) into doublon
  from profils where identifiant is not null
  group by lower(identifiant) having count(*) > 1 limit 1;

  if doublon is not null then
    raise exception 'Deux comptes partagent l''identifiant « % » à la casse près. Renommez-en un avant cette migration.', doublon;
  end if;
end $$;

alter table profils drop constraint if exists profils_identifiant_key;
drop index if exists profils_identifiant_ci;
create unique index profils_identifiant_ci on profils (lower(identifiant));

-- ── La connexion tolère la frappe ───────────────────────────────────────────
-- Un espace en trop entre le prénom et le nom ne doit pas empêcher d'entrer.
create or replace function email_par_identifiant(saisie text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from profils p
  join auth.users u on u.id = p.id
  where lower(p.identifiant) = normaliser_identifiant(saisie)
  limit 1;
$$;

-- ── L'inscription pose l'identifiant toute seule ────────────────────────────
-- Il était laissé vide quand le client n'en envoyait pas : le compte existait
-- alors sans nom de connexion, et son propriétaire ne pouvait entrer que par
-- son adresse. C'est la raison pour laquelle seule l'administration se
-- connectait par son nom.
create or replace function gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_demande text := coalesce(new.raw_user_meta_data ->> 'role', 'eleve');
  ident text;
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

  if ident is null or exists (select 1 from profils where lower(identifiant) = ident) then
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
  if role_demande = 'repetiteur' then
    insert into repetiteurs (id, version_contrat_acceptee)
    values (new.id, (select version_contrat from facturation where id = 1));
  end if;
  return new;
end; $$;
