-- Les clés d'accès aux services extérieurs.
--
-- La page des clés affichait « non renseignée » pour tout le monde, faute de
-- table. Celle-ci sépare deux natures qu'on aurait tort de confondre :
--
--   secrète  — la clé Anthropic, celles des agrégateurs de paiement. Elle ne
--              quitte jamais le serveur. `valeur` n'est relue par personne :
--              l'administration ne revoit que `apercu`, les quatre derniers
--              caractères, qui suffisent à vérifier qu'on a collé la bonne.
--   publique — la clé du fournisseur de cartes. Elle part dans le navigateur
--              de chaque visiteur avec la première tuile ; la cacher serait un
--              théâtre. Ce qui la protège est la restriction de domaine posée
--              chez le fournisseur, pas le secret.
--
-- D'où deux politiques de lecture distinctes. Ranger une clé publique avec les
-- secrètes obligerait à ouvrir la lecture de toutes.
create table if not exists cles_api (
  nom text primary key,
  valeur text,
  publique boolean not null default false,
  apercu text,
  maj_le timestamptz,
  maj_par uuid references profils (id)
);

-- Le style de la carte est une URL et non un simple jeton : changer de
-- fournisseur, c'est changer l'URL, pas seulement la clé. `{cle}` y est
-- remplacé par la valeur de `carte_cle`. Par défaut, les tuiles de
-- démonstration de MapLibre, qui ne demandent aucun compte — la carte
-- fonctionne donc avant même qu'une clé existe.
insert into cles_api (nom, valeur, publique, apercu) values
  ('carte_style', 'https://demotiles.maplibre.org/style.json', true,
   'demotiles.maplibre.org'),
  ('carte_cle', null, true, null),
  ('anthropic', null, false, null),
  ('orange', null, false, null),
  ('mtn', null, false, null)
on conflict (nom) do nothing;

alter table cles_api enable row level security;

-- Les clés publiques sont lisibles par tous : elles partent de toute façon
-- dans le navigateur. Une clé publique non renseignée ne révèle rien non plus.
drop policy if exists "lire les cles publiques" on cles_api;
create policy "lire les cles publiques" on cles_api
  for select using (publique);

-- Les secrètes ne se lisent que côté serveur, avec la clé de service. Aucune
-- politique ne les ouvre — pas même à l'administration : `est_admin()` ici
-- rendrait la clé Anthropic récupérable depuis un navigateur d'administrateur,
-- c'est-à-dire depuis n'importe quelle extension installée chez lui.
drop policy if exists "l'administration ecrit les cles" on cles_api;
create policy "l'administration ecrit les cles" on cles_api
  for update using (est_admin()) with check (est_admin());

/**
 * Poser une clé sans jamais la relire.
 *
 * L'aperçu est calculé ici, à l'écriture. Le calculer à la lecture supposerait
 * de relire `valeur`, ce que justement personne ne doit pouvoir faire.
 */
create or replace function poser_cle(nom_cle text, nouvelle_valeur text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Seule l''administration pose une clé'
      using errcode = '42501';
  end if;

  update cles_api set
    valeur = nullif(nouvelle_valeur, ''),
    apercu = case
      when nullif(nouvelle_valeur, '') is null then null
      when publique then nouvelle_valeur
      else '…' || right(nouvelle_valeur, 4)
    end,
    maj_le = now(),
    maj_par = auth.uid()
  where nom = nom_cle;

  if not found then
    raise exception 'Clé inconnue : %', nom_cle;
  end if;
end; $$;

revoke all on function poser_cle(text, text) from public, anon;
