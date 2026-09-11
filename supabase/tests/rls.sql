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

rollback;
