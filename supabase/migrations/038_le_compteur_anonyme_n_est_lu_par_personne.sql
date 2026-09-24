-- `creations_anonymes` n'a de politique pour personne, et c'est voulu.
--
-- La suite de tests vérifie qu'aucune table protégée par RLS ne se retrouve
-- sans politique — c'est presque toujours un oubli, et un oubli qui ferme une
-- table au lieu de la protéger finit par être « réparé » en l'ouvrant.
--
-- Celle-ci est l'exception : seule `creer_compte_enfant_seul` y touche, et
-- elle contourne la RLS parce qu'elle est `security definer`. Personne
-- d'autre n'a à lire combien de comptes ont été créés cette heure-ci.
--
-- On l'écrit donc en toutes lettres, plutôt que de laisser un vide que
-- quelqu'un prendra pour un oubli.
drop policy if exists "personne ne lit le compteur" on creations_anonymes;
create policy "personne ne lit le compteur" on creations_anonymes
  for select to authenticated, anon
  using (false);
