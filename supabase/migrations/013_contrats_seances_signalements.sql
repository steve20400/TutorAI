-- Trois tables n'avaient aucune politique.
--
-- `contrats`, `seances_humaines` et `signalements` avaient RLS activé et pas
-- une seule règle. Postgres refuse alors tout : rien ne fuyait, mais rien ne
-- fonctionnait non plus, et personne ne s'en apercevait parce que les écrans
-- correspondants affichaient sagement leur état vide. Le tableau de bord de
-- l'administration annonçait « 0 séance en direct » alors qu'une séance était
-- en cours depuis vingt minutes.
--
-- Le plus grave est `signalements`. C'est la table où un parent dit qu'il se
-- passe quelque chose avec un répétiteur. Sans politique d'écriture, le bouton
-- « Signaler » de la spécification ne pouvait rien insérer — sur un produit
-- dont c'est la raison d'être, l'alerte était muette.
--
-- Un écran vide se lit comme « il n'y a rien à voir », jamais comme « je n'ai
-- pas le droit de regarder ». C'est ce qui rend ce genre d'oubli long à
-- trouver, et pourquoi la suite de tests reçoit ici quatre vérifications de
-- plus.

-- ── Contrats ──────────────────────────────────────────────────────────────
-- Trois personnes sont parties au contrat, et l'administration arbitre.
create policy "qui voit un contrat" on contrats
  for select using (
    parent_id = auth.uid()
    or eleve_id = auth.uid()
    or repetiteur_id = auth.uid()
    or est_mon_enfant(eleve_id)
    or est_admin()
  );

-- Seul le parent engage. Ni l'élève — un mineur ne signe pas —, ni le
-- répétiteur, qui se donnerait des élèves tout seul.
create policy "le parent engage" on contrats
  for insert with check (parent_id = auth.uid() and est_mon_enfant(eleve_id));

create policy "le parent modifie son contrat" on contrats
  for update using (parent_id = auth.uid() or est_admin())
  with check (parent_id = auth.uid() or est_admin());

-- ── Séances humaines ──────────────────────────────────────────────────────
-- L'administration voit TOUTES les séances, et c'est le sujet du produit : la
-- surveillance n'est pas un effet de bord, c'est la promesse faite au parent.
create policy "qui voit une seance" on seances_humaines
  for select using (
    est_admin()
    or exists (
      select 1 from contrats c
      where c.id = seances_humaines.contrat_id
        and (
          c.parent_id = auth.uid()
          or c.eleve_id = auth.uid()
          or c.repetiteur_id = auth.uid()
          or est_mon_enfant(c.eleve_id)
        )
    )
  );

-- Le répétiteur ouvre et ferme la séance. Le parent n'a pas à la démarrer, et
-- surtout il ne doit pas pouvoir la clore : une séance qu'on peut terminer
-- sans trace est une séance qu'on peut effacer.
create policy "le repetiteur tient la seance" on seances_humaines
  for insert with check (
    exists (
      select 1 from contrats c
      where c.id = contrat_id and c.repetiteur_id = auth.uid()
    )
  );

create policy "le repetiteur clot la seance" on seances_humaines
  for update using (
    est_admin()
    or exists (
      select 1 from contrats c
      where c.id = seances_humaines.contrat_id and c.repetiteur_id = auth.uid()
    )
  );

-- ── Signalements ──────────────────────────────────────────────────────────
-- N'importe quel compte connecté peut signaler. Aucune condition de lien avec
-- la séance : demander à celui qui alerte de prouver d'abord sa légitimité,
-- c'est ajouter un obstacle au moment précis où il n'en faut aucun. Un
-- signalement infondé se classe ; un signalement qu'on n'a pas pu déposer ne
-- se rattrape pas.
create policy "signaler" on signalements
  for insert with check (auteur_id = auth.uid());

-- En revanche on ne relit que le sien. L'administration lit tout.
create policy "lire un signalement" on signalements
  for select using (auteur_id = auth.uid() or est_admin());

-- L'auteur ne peut pas revenir sur son signalement : seule l'administration
-- le traite. Sinon un répétiteur ayant obtenu un retrait sous pression ferait
-- disparaître l'alerte, et avec elle la trace qu'elle a existé.
create policy "l'administration traite les signalements" on signalements
  for update using (est_admin()) with check (est_admin());
