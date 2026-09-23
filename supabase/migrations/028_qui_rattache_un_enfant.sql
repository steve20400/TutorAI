-- Personne ne se déclare parent d'un enfant tout seul.
--
-- La politique d'écriture sur `liens_familiaux` était `parent_id = auth.uid()`.
-- Elle vérifiait que celui qui s'inscrit comme parent est bien lui-même — elle
-- ne vérifiait pas qu'il ait le moindre droit sur cet enfant. N'importe quel
-- compte adulte connaissant l'identifiant d'un enfant pouvait s'y rattacher.
--
-- Et cet identifiant n'est pas secret : un répétiteur voit celui de ses
-- élèves, il est dans le contrat. Un répétiteur malveillant ouvrait donc un
-- second compte adulte, se rattachait à son élève, et obtenait son profil, ses
-- tuteurs, sa mémoire d'apprentissage, ses séances, ses messages et les
-- enregistrements de ses séances humaines.
--
-- Désormais aucun chemin direct. Un lien ne naît plus que de trois façons,
-- toutes passant par une fonction qui vérifie de quel droit elle agit :
--   — le parent crée le compte de l'enfant (`creer_compte_eleve`) ;
--   — l'enfant RECONNAÎT un adulte qui l'a demandé (migration suivante) ;
--   — l'administration tranche.
--
-- L'enfant reconnaît, l'adulte ne prend pas. C'est la seule chose qu'un enfant
-- fasse mieux qu'un adulte : reconnaître un visage. Lui demander le mot de
-- passe de l'enfant aurait été plus simple, et aurait appris à chaque enfant
-- de la plateforme que donner son mot de passe à un adulte qui aide est
-- normal — exactement l'habitude qu'un abuseur exploite ensuite.
drop policy if exists "creer un lien en tant que parent" on liens_familiaux;

-- L'administration, elle, doit pouvoir trancher : un enfant dont le parent a
-- perdu son compte n'a plus aucun chemin sans elle.
drop policy if exists "l'administration rattache" on liens_familiaux;
create policy "l'administration rattache" on liens_familiaux
  for insert to authenticated
  with check (est_admin());

drop policy if exists "l'administration detache" on liens_familiaux;
create policy "l'administration detache" on liens_familiaux
  for delete to authenticated
  using (est_admin());
