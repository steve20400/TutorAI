-- Le coffre des pièces justificatives.
--
-- Privé, et ce n'est pas une option : il contient des cartes d'identité et des
-- extraits de casier judiciaire. Un bucket public donne une URL devinable à
-- qui connaît le chemin — pour ce contenu-là, ce serait une fuite de pièces
-- d'identité, pas un défaut d'ergonomie.
--
-- Les fichiers ne sont donc jamais servis directement : l'administration
-- obtient une URL signée, valable quelques minutes, générée à la demande.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pieces', 'pieces', false,
  -- 8 Mo : une photo de carte d'identité prise au téléphone dépasse rarement
  -- 3 Mo, et un plafond haut laisse passer des téléversements accidentels qui
  -- coûtent du stockage pour rien.
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Qui écrit ───────────────────────────────────────────────────────────────
-- Le répétiteur dépose dans SON dossier, nommé par son identifiant. Sans la
-- condition sur le préfixe, il pourrait écrire dans le dossier d'un autre et
-- remplacer une pièce déjà déposée.
drop policy if exists "un repetiteur depose ses pieces" on storage.objects;
create policy "un repetiteur depose ses pieces" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pieces'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Qui lit ─────────────────────────────────────────────────────────────────
-- L'administration seule. Le répétiteur ne relit PAS ce qu'il a déposé, et
-- c'est volontaire : la règle existe déjà sur `pieces_justificatives` et
-- `rls.sql` la vérifie. Une pièce déposée par erreur — la mauvaise photo, le
-- document de quelqu'un d'autre — ne doit pas rester consultable par celui
-- qui l'a envoyée ; elle se remplace, elle ne se relit pas.
drop policy if exists "l'administration lit les pieces" on storage.objects;
create policy "l'administration lit les pieces" on storage.objects
  for select to authenticated
  using (bucket_id = 'pieces' and est_admin());

-- ── Qui efface ──────────────────────────────────────────────────────────────
-- Personne. Une pièce qui a servi à vérifier quelqu'un est la preuve que la
-- vérification a eu lieu. Le jour où une décision est contestée, c'est elle
-- qu'on produit — et c'est exactement ce jour-là qu'elle aurait disparu.
