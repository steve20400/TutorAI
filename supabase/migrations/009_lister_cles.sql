-- Voir qu'une clé est posée sans pouvoir la relire.
--
-- La politique de lecture de `cles_api` n'ouvre que les clés publiques. C'est
-- volontaire — mais l'administration doit quand même voir que la clé Anthropic
-- est renseignée, et laquelle : sans cela, la page des clés affiche « non
-- renseignée » pour une clé qui fonctionne, et on la repose par-dessus.
--
-- Une politique ne peut pas répondre à ce besoin : RLS filtre des LIGNES, pas
-- des colonnes. Autoriser l'administration à lire la ligne lui donnerait
-- `valeur` avec, c'est-à-dire rendrait la clé Anthropic récupérable depuis un
-- navigateur d'administrateur — donc depuis n'importe quelle extension
-- installée chez lui. Cette fonction renvoie tout sauf la valeur.
create or replace function lister_cles()
returns table (nom text, publique boolean, apercu text, maj_le timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;

  return query
    select c.nom, c.publique, c.apercu, c.maj_le
    from cles_api c
    order by c.nom;
end; $$;

revoke all on function lister_cles() from public, anon;
