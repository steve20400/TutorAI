-- Les écrans écoutent la base au lieu d'attendre un rechargement.
--
-- Une demande de rattachement n'apparaissait qu'au chargement suivant. Un
-- enfant connecté ne voyait rien arriver ; un adulte ne voyait pas
-- l'acceptation. Il fallait se déconnecter, se reconnecter, recharger — c'est
---à-dire deviner qu'il s'était passé quelque chose pour aller le vérifier.
--
-- Supabase publie les changements de ces tables en direct. La RLS s'applique
-- à cette publication comme au reste : chacun ne reçoit que les lignes qu'il
-- a déjà le droit de lire. On n'ouvre donc aucun chemin nouveau vers les
-- données — seulement une notification de mouvement sur ce qui est déjà
-- visible.
--
-- Trois tables, et seulement trois. Publier une table qui bouge souvent
-- enverrait un message à chaque écriture, à tous ceux qui écoutent, pour un
-- écran qui n'en a pas besoin.

begin;

do $$
declare
  t text;
begin
  foreach t in array array[
    'demandes_rattachement',   -- l'adulte demande, l'enfant voit arriver
    'liens_familiaux',         -- l'enfant accepte, l'adulte le voit
    'demandes_mot_de_passe'    -- l'enfant est bloqué, l'adulte le voit
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
