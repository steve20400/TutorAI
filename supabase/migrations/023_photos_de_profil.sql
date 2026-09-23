-- Le coffre des photos de profil.
--
-- Séparé de `pieces`, et c'est volontaire : une photo de profil est faite pour
-- être vue — par les familles qui choisissent un répétiteur, par
-- l'administration qui arbitre. Une carte d'identité ne l'est pas. Les mettre
-- dans le même bucket forcerait à choisir une seule politique pour deux
-- besoins opposés.
--
-- Public, avec des chemins imprévisibles. Une photo servie par lien signé
-- devrait être re-signée à chaque affichage, périmerait dans le cache du
-- navigateur, et rechargerait la même image à chaque page — sur une connexion
-- camerounaise, c'est un coût réel pour protéger ce que la personne a
-- justement choisi de montrer.
--
-- Le nom du fichier contient l'identifiant du compte et un aléa : personne ne
-- devine l'adresse de la photo de quelqu'un d'autre.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', true,
  -- 2 Mo : le navigateur réduit l'image avant l'envoi, et ce qui arrive ici
  -- pèse quelques centaines de kilo-octets. Un plafond plus haut ne laisserait
  -- passer que des téléversements qui ont contourné la réduction.
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Qui dépose ──────────────────────────────────────────────────────────────
-- Chacun dans son dossier, et surtout : PAS les élèves.
--
-- Un enfant ne dépose pas sa photo — la règle est déjà tenue sur
-- `profils.photo_url` par un déclencheur, mais elle doit l'être aussi sur le
-- fichier. Sans cette condition, un élève pourrait téléverser une image sans
-- jamais la rattacher à son profil : le fichier existerait quand même, sur un
-- bucket public, et personne ne saurait qu'il est là.
drop policy if exists "chacun depose sa photo" on storage.objects;
create policy "chacun depose sa photo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from profils
      where id = auth.uid() and role in ('parent', 'repetiteur', 'admin')
    )
  );

-- Remplacer la sienne : on change de photo plus souvent qu'on n'en dépose une.
drop policy if exists "chacun remplace sa photo" on storage.objects;
create policy "chacun remplace sa photo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chacun retire sa photo" on storage.objects;
create policy "chacun retire sa photo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
