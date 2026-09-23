-- =============================================================================
-- Test d'isolation RLS
--
-- Vérifie la promesse centrale du produit : un élève ne peut pas lire les
-- données d'un autre élève, et un parent ne voit que ses propres enfants.
--
-- Tout se déroule dans une transaction annulée à la fin : la base ressort
-- exactement dans l'état où elle est entrée.
--
--   psql "$URL_BASE" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- =============================================================================

begin;

\set eleve_a  '11111111-1111-1111-1111-111111111111'
\set eleve_b  '22222222-2222-2222-2222-222222222222'
\set parent_a '33333333-3333-3333-3333-333333333333'

-- --- Montage : deux élèves, un parent, chacun sa séance -----------------------
-- L'insertion dans auth.users doit déclencher la création du profil.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  (:'eleve_a',  '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'a@test.local', '{"prenom":"Awa","role":"eleve"}'),
  (:'eleve_b',  '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'b@test.local', '{"prenom":"Bilal","role":"eleve"}'),
  (:'parent_a', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'p@test.local', '{"prenom":"Mme Awa","role":"parent"}');

insert into liens_familiaux (parent_id, eleve_id) values (:'parent_a', :'eleve_a');

insert into tuteurs_ia (id, eleve_id, programme_id, matiere, niveau)
select 'aaaaaaaa-0000-0000-0000-000000000001', :'eleve_a', id, matiere, niveau
from programmes limit 1;

insert into tuteurs_ia (id, eleve_id, programme_id, matiere, niveau)
select 'bbbbbbbb-0000-0000-0000-000000000001', :'eleve_b', id, matiere, niveau
from programmes limit 1;

insert into seances (id, tuteur_id) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001');

insert into messages (seance_id, auteur, contenu) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'eleve', 'secret de Awa'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'eleve', 'secret de Bilal');

-- --- Contrôles ---------------------------------------------------------------

create or replace function verifier(intitule text, obtenu int, attendu int)
returns text language sql immutable as $$
  select case when obtenu = attendu
              then 'OK    ' || intitule
              else 'ECHEC ' || intitule || ' (obtenu ' || obtenu
                   || ', attendu ' || attendu || ')' end;
$$;

-- 1. Le déclencheur a bien créé les trois profils.
select verifier('le declencheur cree le profil a l''inscription',
                (select count(*)::int from profils
                 where id in (:'eleve_a', :'eleve_b', :'parent_a')), 3);

-- --- Vu par l'élève A --------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select verifier('l''eleve voit sa propre seance',
                (select count(*)::int from seances), 1);

select verifier('l''eleve ne voit PAS la seance d''un autre eleve',
                (select count(*)::int from seances
                 where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 0);

select verifier('l''eleve ne voit PAS les messages d''un autre eleve',
                (select count(*)::int from messages
                 where contenu = 'secret de Bilal'), 0);

select verifier('l''eleve ne voit PAS le tuteur d''un autre eleve',
                (select count(*)::int from tuteurs_ia
                 where eleve_id = '22222222-2222-2222-2222-222222222222'), 0);

select verifier('l''eleve ne voit PAS le profil d''un autre eleve',
                (select count(*)::int from profils
                 where id = '22222222-2222-2222-2222-222222222222'), 0);

-- --- Vu par le parent de A ---------------------------------------------------
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('le parent voit les seances de son enfant',
                (select count(*)::int from seances), 1);

select verifier('le parent ne voit PAS les seances d''un enfant qui n''est pas le sien',
                (select count(*)::int from seances
                 where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 0);

-- --- Vu par un visiteur non connecte -----------------------------------------
set local role anon;
set local "request.jwt.claims" = '';

select verifier('un visiteur non connecte ne voit aucune seance',
                (select count(*)::int from seances), 0);

select verifier('un visiteur non connecte ne voit aucun message',
                (select count(*)::int from messages), 0);

select verifier('un visiteur non connecte voit les programmes publies',
                (select count(*)::int from programmes), 1);

-- --- Répétiteurs : la règle de visibilité ------------------------------------
-- C'est la promesse faite aux parents. Elle vit dans la base, pas seulement
-- dans la requête de l'annuaire : un `where statut = 'verifie'` oublié côté
-- application ne doit pas suffire à exposer un profil non contrôlé.

reset role;
set local "request.jwt.claims" = '';

\set repet_ok '44444444-4444-4444-4444-444444444444'
\set repet_ko '55555555-5555-5555-5555-555555555555'

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  (:'repet_ok', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ok@test.local',
   '{"prenom":"Ndongo","role":"repetiteur"}'),
  (:'repet_ko', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ko@test.local',
   '{"prenom":"Inconnu","role":"repetiteur"}');

-- Le déclencheur a créé les deux fiches en 'brouillon' ; on en vérifie une.
update repetiteurs set statut = 'verifie' where id = :'repet_ok';

select verifier('le declencheur cree la fiche du repetiteur a l''inscription',
                (select count(*)::int from repetiteurs
                 where id in (:'repet_ok', :'repet_ko')), 2);

select verifier('la fiche nait en brouillon, donc invisible',
                (select count(*)::int from repetiteurs
                 where id = :'repet_ko' and statut = 'brouillon'), 1);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('un parent voit un repetiteur verifie',
                (select count(*)::int from repetiteurs
                 where id = '44444444-4444-4444-4444-444444444444'), 1);

select verifier('un parent ne voit PAS un repetiteur non verifie',
                (select count(*)::int from repetiteurs
                 where id = '55555555-5555-5555-5555-555555555555'), 0);

-- Vu par le répétiteur non vérifié lui-même.
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select verifier('un repetiteur voit sa propre fiche meme non verifiee',
                (select count(*)::int from repetiteurs
                 where id = '55555555-5555-5555-5555-555555555555'), 1);

-- Vu par un visiteur non connecté.
set local role anon;
set local "request.jwt.claims" = '';

select verifier('un visiteur non connecte ne voit pas les repetiteurs non verifies',
                (select count(*)::int from repetiteurs
                 where id = '55555555-5555-5555-5555-555555555555'), 0);

-- =============================================================================
-- Pièces justificatives, redevances, porte-monnaie
--
-- Ces règles-là protègent des choses différentes : l'identité d'un adulte qui
-- veut approcher des enfants, l'argent, et le droit de figurer dans l'annuaire.
-- =============================================================================

-- Repasse en superutilisateur pour monter la scène.
reset role;
set local "request.jwt.claims" = '';

-- Le répétiteur vérifié dépose une pièce.
insert into pieces_justificatives (repetiteur_id, type_cle, chemin)
values ('44444444-4444-4444-4444-444444444444', 'cni', 'pieces/44/cni.jpg');

-- --- Une pièce déposée ne se relit pas, même par celui qui l'a déposée -------
-- Une pièce relisible est une pièce qu'on peut échanger après examen.

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select verifier('un repetiteur ne relit PAS sa propre piece deposee',
                (select count(*)::int from pieces_justificatives), 0);

set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('un parent ne voit AUCUNE piece justificative',
                (select count(*)::int from pieces_justificatives), 0);

-- --- Le porte-monnaie est éteint : personne n'y écrit ------------------------

set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select verifier('creation de portefeuille refusee, module eteint',
                (select case when exists (
                   select 1 from portefeuilles where id = '44444444-4444-4444-4444-444444444444'
                 ) then 1 else 0 end), 0);

-- --- Un impayé échu sort de l'annuaire --------------------------------------
-- C'est le seul levier de recouvrement de la plateforme, puisqu'elle ne
-- détient pas l'argent.

reset role;
set local "request.jwt.claims" = '';

insert into redevances
  (repetiteur_id, periode, mode, montant_unitaire, eleves_actifs, montant_total, echeance)
values
  ('44444444-4444-4444-4444-444444444444', date_trunc('month', current_date)::date,
   'par_eleve_actif', 2000, 1, 2000, current_date - 1);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('un repetiteur verifie mais impaye sort de l''annuaire',
                (select count(*)::int from repetiteurs
                 where id = '44444444-4444-4444-4444-444444444444'), 0);

-- Une fois réglée, la fiche revient.
reset role;
set local "request.jwt.claims" = '';
update redevances set statut = 'payee', payee_le = now()
where repetiteur_id = '44444444-4444-4444-4444-444444444444';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('la fiche revient dans l''annuaire une fois la redevance payee',
                (select count(*)::int from repetiteurs
                 where id = '44444444-4444-4444-4444-444444444444'), 1);

-- --- Une redevance ne se lit que par son destinataire ------------------------

set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select verifier('un repetiteur ne voit PAS la redevance d''un autre',
                (select count(*)::int from redevances), 0);

set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select verifier('un repetiteur voit sa propre redevance',
                (select count(*)::int from redevances), 1);

-- --- Un contrat non réaccepté sort aussi de l'annuaire -----------------------
-- Changer la facturation change le contrat : on ne prélève pas sur une base
-- que le répétiteur n'a jamais signée.

reset role;
set local "request.jwt.claims" = '';
update facturation set version_contrat = version_contrat + 1 where id = 1;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('un repetiteur qui n''a pas reaccepte le contrat sort de l''annuaire',
                (select count(*)::int from repetiteurs
                 where id = '44444444-4444-4444-4444-444444444444'), 0);

-- =============================================================================
-- Basculer de mode de facturation n'efface rien
--
-- L'administrateur doit pouvoir passer du montant fixe au pourcentage, puis
-- revenir, sans avoir à ressaisir ce qu'il avait réglé. C'est toute la
-- promesse de l'espace d'administration : des réglages qui survivent aux
-- changements d'avis.
-- =============================================================================

reset role;
set local "request.jwt.claims" = '';

update facturation
   set mode = 'par_eleve_actif', montant_par_eleve = 2500, pourcentage = 12.5
 where id = 1;

-- On bascule vers le pourcentage : le montant fixe doit rester en mémoire.
update facturation set mode = 'pourcentage_gains' where id = 1;

select verifier('le montant fixe survit au passage en pourcentage',
                (select montant_par_eleve from facturation where id = 1), 2500);

-- Et on revient : le pourcentage doit être resté lui aussi.
update facturation set mode = 'par_eleve_actif' where id = 1;

select verifier('le pourcentage survit au retour au montant fixe',
                (select (pourcentage * 10)::int from facturation where id = 1), 125);

select verifier('le mode est bien revenu au montant fixe',
                (select case when mode = 'par_eleve_actif' then 1 else 0 end
                   from facturation where id = 1), 1);

-- =============================================================================
-- L'espace d'administration est fermé au niveau de la base
--
-- Trois serrures protègent l'administration : le middleware qui garde la
-- route, le contrôle du rôle dans la page, et ces politiques-ci. Les deux
-- premières sont du code applicatif — on peut les contourner en appelant
-- directement l'API. Celles-ci, non.
-- =============================================================================

reset role;
set local "request.jwt.claims" = '';

insert into journal_admin (admin_id, action, cible_type, cible_id)
select id, 'test', 'parametre', 'ia_active' from profils limit 1;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select verifier('un eleve ne lit PAS le journal d''administration',
                (select count(*)::int from journal_admin), 0);

-- Allumer le tuteur IA depuis un compte élève : l'écriture ne touche aucune
-- ligne, la politique la rejette en silence.
update parametres set valeur = 'true'::jsonb where cle = 'ia_active';

select verifier('un eleve ne peut PAS allumer un module',
                (select case when valeur = 'true'::jsonb then 1 else 0 end
                   from parametres where cle = 'ia_active'), 0);

-- Se facturer zéro franc à soi-même.
insert into redevances
  (repetiteur_id, periode, mode, montant_unitaire, eleves_actifs, montant_total, echeance)
select '44444444-4444-4444-4444-444444444444', '2020-01-01'::date,
       'par_eleve_actif', 0, 0, 0, current_date
where false;

select verifier('un eleve ne cree PAS de redevance',
                (select count(*)::int from redevances where periode = '2020-01-01'), 0);

-- Et le répétiteur lui-même ne peut pas se déclarer vérifié : le déclencheur
-- `sur_maj_repetiteur` lève. On attrape pour que la suite continue.
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

do $$
begin
  update repetiteurs set statut = 'verifie'
  where id = '55555555-5555-5555-5555-555555555555';
exception when insufficient_privilege then
  null;
end $$;

reset role;
set local "request.jwt.claims" = '';

select verifier('un repetiteur ne se declare PAS verifie lui-meme',
                (select case when statut = 'verifie' then 1 else 0 end
                   from repetiteurs where id = '55555555-5555-5555-5555-555555555555'), 0);

-- ---------------------------------------------------------------------------
-- Se nommer administrateur soi-même.
--
-- C'est l'attaque qui marchait : un parent connecté écrivait sa propre ligne
-- `profils`, colonne `role`, et obtenait l'administration entière. Le
-- middleware et la garde de page relisent tous deux cette colonne — ils
-- validaient donc l'élévation qu'ils étaient censés empêcher.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  update profils set role = 'admin'
  where id = '33333333-3333-3333-3333-333333333333';
exception when insufficient_privilege then
  null;
end $$;

reset role;
set local "request.jwt.claims" = '';

select verifier('un parent ne se nomme PAS administrateur',
                (select case when role = 'admin' then 1 else 0 end
                   from profils where id = '33333333-3333-3333-3333-333333333333'), 0);

-- L'identifiant sert de nom de connexion à l'administration. Un compte
-- supprimé libérerait le sien ; personne ne doit pouvoir le reprendre.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  update profils set identifiant = 'GALILEE-BIS'
  where id = '33333333-3333-3333-3333-333333333333';
exception when insufficient_privilege then
  null;
end $$;

reset role;
set local "request.jwt.claims" = '';

select verifier('un parent ne change PAS son identifiant',
                (select count(*)::int from profils where identifiant = 'GALILEE-BIS'), 0);

-- ---------------------------------------------------------------------------
-- Les clés d'accès aux services extérieurs.
--
-- La clé Anthropic paie à l'appel : qui la lit dépense l'argent de la
-- plateforme. Elle ne doit sortir de la base par aucun chemin ouvert à un
-- navigateur — pas même celui d'un administrateur, dont les extensions voient
-- tout ce que la page reçoit.
update cles_api set valeur = 'sk-ant-NE-DOIT-PAS-SORTIR', apercu = '…TIR'
where nom = 'anthropic';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('un parent ne lit PAS la cle Anthropic',
                (select count(*)::int from cles_api where nom = 'anthropic'), 0);

select verifier('un parent lit le fond de carte, qui est public',
                (select count(*)::int from cles_api where nom = 'carte_style'), 1);

reset role;
set local "request.jwt.claims" = '';

-- Et l'administration elle-même : elle voit que la clé est posée, jamais sa
-- valeur. `lister_cles` ne renvoie pas la colonne.
select verifier('lister_cles ne renvoie aucune colonne de valeur',
                (select count(*)::int
                   from information_schema.routines r
                   join information_schema.parameters p
                     on p.specific_name = r.specific_name
                  where r.routine_name = 'lister_cles'
                    and p.parameter_name = 'valeur'), 0);

-- ---------------------------------------------------------------------------
-- La désactivation d'un compte.
--
-- On ne supprime pas : effacer l'auteur d'une séance effacerait la séance, sur
-- un produit dont la promesse est qu'une trace subsiste. Mais une
-- désactivation qui laisse la fiche dans l'annuaire ne désactive rien — et
-- c'est exactement ce qui arrivait, parce qu'une politique permissive de plus
-- ÉLARGIT l'accès au lieu de le restreindre.
update profils set desactive_le = now()
where id = '55555555-5555-5555-5555-555555555555';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select verifier('un parent ne voit PAS un repetiteur desactive',
                (select count(*)::int from repetiteurs
                  where id = '55555555-5555-5555-5555-555555555555'), 0);

reset role;
set local "request.jwt.claims" = '';

-- Lui doit pouvoir relire sa fiche : sans cela il ne saurait pas ce qu'on lui
-- reproche, et ne pourrait rien corriger.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select verifier('un repetiteur desactive relit SA fiche',
                (select count(*)::int from repetiteurs
                  where id = '55555555-5555-5555-5555-555555555555'), 1);

reset role;
set local "request.jwt.claims" = '';

update profils set desactive_le = null
where id = '55555555-5555-5555-5555-555555555555';

-- Une seule politique de lecture sur les fiches. Trois portes vers la même
-- pièce, c'est deux qu'on oubliera de mettre à jour la prochaine fois.
select verifier('une seule politique de lecture sur repetiteurs',
                (select count(*)::int from pg_policies
                  where tablename = 'repetiteurs' and cmd = 'SELECT'), 1);

-- ---------------------------------------------------------------------------
-- Aucune table ne doit rester sans politique.
--
-- `contrats`, `seances_humaines` et `signalements` ont vécu avec RLS activé et
-- pas une seule règle. Postgres refuse alors tout : rien ne fuyait, mais le
-- bouton « Signaler » d'un parent n'insérait rien, et le tableau de bord
-- annonçait « 0 séance en direct » pendant qu'une séance avait lieu.
--
-- Un écran vide se lit comme « il n'y a rien à voir », jamais comme « je n'ai
-- pas le droit de regarder ». D'où cette vérification générale, qui attrapera
-- la prochaine table ajoutée sans ses règles.
select verifier('aucune table avec RLS n''est privee de politique',
                (select count(*)::int
                   from pg_tables t
                  where t.schemaname = 'public'
                    and t.rowsecurity
                    and not exists (
                      select 1 from pg_policies p
                       where p.schemaname = 'public'
                         and p.tablename = t.tablename)), 0);

-- L'administration voit toutes les séances. Ce n'est pas un privilège de
-- confort : la surveillance est la promesse faite au parent.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select verifier('un eleve ne voit PAS le contrat d''un autre',
                (select count(*)::int from contrats
                  where eleve_id <> '11111111-1111-1111-1111-111111111111'), 0);

-- Signaler ne demande aucune justification préalable : un signalement infondé
-- se classe, un signalement qu'on n'a pas pu déposer ne se rattrape pas.
insert into signalements (auteur_id, motif)
values ('11111111-1111-1111-1111-111111111111', 'Essai de signalement');

select verifier('un eleve PEUT signaler',
                (select count(*)::int from signalements
                  where motif = 'Essai de signalement'), 1);

reset role;
set local "request.jwt.claims" = '';

-- ---------------------------------------------------------------------------
-- Un enfant n'a pas d'adresse mail.
--
-- Supabase impose une adresse unique par compte. Dans une maison où l'on
-- partage un téléphone et une boîte mail, le premier inscrit prenait l'adresse
-- et fermait la porte aux autres : un enfant inscrit le matin empêchait sa
-- mère de chercher un répétiteur le soir.
--
-- Effet de bord voulu, et le plus important : un mineur ne peut plus ouvrir un
-- compte seul. Il naît rattaché à un adulte identifié.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
begin
  perform creer_compte_eleve('Pirate', 'Sansparent', 'motdepasse');
exception when insufficient_privilege then
  null;
end $$;

select verifier('un eleve ne cree PAS de compte enfant',
                (select count(*)::int from profils where prenom = 'Pirate'), 0);

reset role;
set local "request.jwt.claims" = '';

-- Le parent, lui, le peut — et l'enfant lui est rattaché dans la même
-- transaction. Un enfant a moitie cree, sans lien vers son parent, serait pire
-- que pas d'enfant du tout.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare ident text;
begin
  select identifiant into ident from creer_compte_eleve('Essai', 'Rattache', 'motdepasse');
exception when others then
  null;
end $$;

reset role;
set local "request.jwt.claims" = '';

select verifier('un parent cree un enfant, rattache du meme coup',
                (select count(*)::int
                   from profils p join liens_familiaux l on l.eleve_id = p.id
                  where p.prenom = 'Essai'
                    and l.parent_id = '33333333-3333-3333-3333-333333333333'), 1);

select verifier('l''enfant n''a aucune adresse mail reelle',
                (select count(*)::int from auth.users u
                   join profils p on p.id = u.id
                  where p.prenom = 'Essai'
                    and u.email not like '%@eleves.tutela.cm'), 0);

-- ---------------------------------------------------------------------------
-- Le registre doit pouvoir s'écrire.
--
-- Il a porté une politique de lecture et aucune d'écriture pendant tout le
-- developpement. Postgres refusait donc chaque `insert` — et un `insert` sans
-- `select` ne leve rien : la reponse est 201, zero ligne affectee, personne ne
-- le remarque. Aucun cachet, aucun refus, aucun module allume n'a ete
-- consigne. Les seules entrees venaient des fonctions `security definer`, qui
-- passent outre.
--
-- « Chaque decision est consignee » est la promesse la plus facile a faire et
-- la plus dure a tenir : elle ne vaut que si l'ecriture est verifiee.
-- Un administrateur de test. Il n'y en avait pas : les fixtures ne créent
-- qu'un élève, un parent et deux répétiteurs, et le rôle `admin` ne s'obtient
-- jamais par inscription — c'est précisément ce que protège le déclencheur
-- posé en 004.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('99999999-9999-9999-9999-999999999999',
        '00000000-0000-0000-0000-000000000000', 'authenticated',
        'authenticated', 'admin@test.local',
        '{"prenom":"Registre","role":"eleve"}');

update profils set role = 'admin'
where id = '99999999-9999-9999-9999-999999999999';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

insert into journal_admin (admin_id, action, cible_type, cible_id)
values ('99999999-9999-9999-9999-999999999999', 'essai', 'parametre', 'essai_cle');

select verifier('l''administration ecrit au registre',
                (select count(*)::int from journal_admin where cible_id = 'essai_cle'), 1);

reset role;
set local "request.jwt.claims" = '';

-- On ne journalise pas au nom d'un autre : sans cette condition, une decision
-- pourrait etre inscrite sous l'identite d'un collegue, ce qui retire au
-- registre la seule chose qu'on lui demande — dire qui a decide.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

do $$
begin
  insert into journal_admin (admin_id, action, cible_type, cible_id)
  values ('33333333-3333-3333-3333-333333333333', 'usurpation', 'parametre', 'vol');
exception when insufficient_privilege then
  null;
end $$;

reset role;
set local "request.jwt.claims" = '';

select verifier('un admin ne journalise PAS au nom d''un autre',
                (select count(*)::int from journal_admin where cible_id = 'vol'), 0);

-- Un parent n'ecrit rien au registre, evidemment.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  insert into journal_admin (admin_id, action, cible_type, cible_id)
  values ('33333333-3333-3333-3333-333333333333', 'essai', 'parametre', 'parent_ecrit');
exception when insufficient_privilege then
  null;
end $$;

reset role;
set local "request.jwt.claims" = '';

select verifier('un parent n''ecrit PAS au registre',
                (select count(*)::int from journal_admin where cible_id = 'parent_ecrit'), 0);

rollback;
