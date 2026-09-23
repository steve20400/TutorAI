-- Pouvoir relire ses propres fichiers, pour pouvoir les retirer.
--
-- Le coffre `photos` est public : n'importe qui ayant l'adresse charge
-- l'image. On en avait conclu qu'aucune politique de lecture n'était
-- nécessaire. C'est vrai pour servir un fichier par HTTP, et faux pour tout
-- le reste : l'API de suppression commence par LISTER ce qu'on lui demande
-- d'effacer, et cette liste passe par la RLS de `storage.objects`.
--
-- Sans politique de lecture, la liste revenait vide et la suppression
-- répondait « 200, zéro fichier supprimé ». La politique « chacun retire sa
-- photo » existait depuis la migration 023 et n'avait jamais pu s'appliquer.
--
-- Conséquence concrète : « Retirer » effaçait l'adresse dans le profil et
-- laissait le fichier en place, toujours servi publiquement. Quelqu'un qui
-- retirait sa photo ne la retirait pas.
--
-- La lecture est limitée à son propre dossier. L'administration n'en a pas
-- besoin : une photo de profil, elle la regarde par son adresse publique,
-- comme tout le monde.
drop policy if exists "chacun relit ses photos" on storage.objects;
create policy "chacun relit ses photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
