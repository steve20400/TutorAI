-- L'enfant ne recevait pas les demandes en direct : il n'avait pas le droit
-- de lire la table.
--
-- Côté adulte, le temps réel marchait — un enfant qui accepte apparaît tout
-- seul dans la liste. Côté enfant, la demande n'arrivait jamais : il fallait
-- se déconnecter et se reconnecter pour la voir.
--
-- Les deux écrans écoutent pourtant de la même façon. La différence était
-- dans la table. `liens_familiaux` porte une vraie politique de lecture
-- (« lire ses liens »), alors que `demandes_rattachement` n'en a qu'une, pour
-- l'administration. L'enfant lit ses demandes par `demandes_a_reconnaitre()`,
-- une fonction `security definer` — qui contourne la RLS par construction.
--
-- L'écran fonctionnait donc, et le temps réel non : Realtime évalue la RLS
-- directement sur la table, pour chaque abonné et chaque ligne. Un enfant
-- sans droit de lecture ne reçoit aucun événement. Rien ne le signalait : le
-- canal s'abonnait correctement, il ne recevait simplement jamais rien.
--
-- La politique ne donne que ses propres lignes. Elle est plus large que ce
-- que la fonction rend — celle-ci s'en tient aux demandes en attente, avec
-- prénom et photo — mais ce qu'elle ajoute est l'historique de ses propres
-- décisions, désigné par des identifiants. Un enfant peut savoir ce qu'il a
-- lui-même refusé.

begin;

drop policy if exists "un enfant voit les demandes qui le concernent"
  on demandes_rattachement;

create policy "un enfant voit les demandes qui le concernent"
  on demandes_rattachement
  for select to authenticated
  using (eleve_id = auth.uid());

commit;
