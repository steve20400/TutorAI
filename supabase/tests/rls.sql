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

rollback;
