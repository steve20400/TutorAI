-- L'administration ne pouvait pas apposer son cachet.
--
-- `repetiteurs` n'avait qu'une seule politique d'écriture — « le repetiteur
-- modifie son profil », `id = auth.uid()`. Le déclencheur
-- `proteger_verification_repetiteur` laissait bien passer l'administration,
-- mais un déclencheur ne donne aucun droit : il ne fait qu'autoriser ce que la
-- RLS a déjà permis. Or elle ne permettait rien.
--
-- Conséquence : « Apposer le cachet » et « Refuser une fiche » n'écrivaient
-- rien depuis le premier jour. Aucune fiche déposée par un répétiteur n'a
-- jamais pu être acceptée par le produit ; les fiches vérifiées en base
-- l'avaient été par des scripts, qui ne passent pas par la RLS.
--
-- Personne ne l'a vu parce que l'échec était muet : l'action serveur avalait
-- l'erreur de l'API, la page se rechargeait identique, et un écran qui ne
-- change pas se lit comme « rien à faire », jamais comme « refusé ».
--
-- C'est la troisième fois que ce piège se referme ici : le registre qui
-- n'écrivait pas, les trois tables sans politique, et maintenant celle-ci.
-- Ce sont toujours des droits manquants, jamais des droits de trop — et ils
-- ne se voient que si l'on va jusqu'au bout du geste.
drop policy if exists "l'administration statue sur une fiche" on repetiteurs;
create policy "l'administration statue sur une fiche" on repetiteurs
  for update to authenticated
  using (est_admin())
  with check (est_admin());
