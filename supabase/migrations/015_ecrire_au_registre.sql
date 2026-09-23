-- Le registre ne s'écrivait pas.
--
-- `journal_admin` portait une politique de lecture et aucune d'écriture.
-- Postgres refuse alors tout `insert` — et un `insert` sans `select` ne lève
-- rien : PostgREST répond 201, zéro ligne affectée, personne ne le remarque.
--
-- Conséquence : depuis le premier jour, aucun cachet, aucun refus, aucun
-- module allumé, aucun changement de facturation n'a été consigné. Les six
-- seules entrées de la table venaient de `desactiver_compte` et
-- `reactiver_compte`, qui sont `security definer` et passent outre.
--
-- L'espace d'administration affichait donc un registre qui paraissait
-- simplement peu rempli, alors qu'il était muet. Et c'est la promesse la plus
-- facile à faire et la plus dure à tenir : « chaque décision est consignée »
-- ne vaut que si l'écriture est vérifiée, jamais supposée.
--
-- `admin_id = auth.uid()` : on ne journalise pas au nom d'un autre. Sans
-- cette condition, un administrateur pourrait inscrire une décision sous
-- l'identité d'un collègue, ce qui retire au registre la seule chose qu'on
-- lui demande — dire qui a décidé.
create policy "l'administration ecrit au registre" on journal_admin
  for insert with check (est_admin() and admin_id = auth.uid());

-- Personne ne réécrit ni n'efface une entrée, pas même l'administration. Un
-- journal qu'on peut corriger après coup ne prouve rien : le jour où une
-- décision est contestée, c'est précisément l'entrée gênante qui aurait
-- disparu.
