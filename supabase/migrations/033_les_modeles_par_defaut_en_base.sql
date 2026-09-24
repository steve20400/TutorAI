-- Les noms de modèles appartiennent à la base, pas au code.
--
-- Ils étaient écrits en dur dans la route d'administration, comme valeurs de
-- départ appliquées au changement de fournisseur. Or un nom de modèle est une
-- donnée qui bouge : Google renomme, Anthropic publie, les prix changent. Le
-- jour où `gemini-2.0-flash` disparaît, il ne faut pas redéployer un service
-- pour s'en apercevoir.
insert into parametres (cle, valeur, libelle) values
  ('ia_modeles_par_defaut',
   '{
      "anthropic":  {"essai": "claude-haiku-4-5-20251001", "compte": "claude-haiku-4-5-20251001"},
      "gemini":     {"essai": "gemini-2.0-flash",          "compte": "gemini-2.0-flash"},
      "compatible": {"essai": "",                          "compte": ""}
    }'::jsonb,
   'Modèle servi par défaut quand on choisit un fournisseur')
on conflict (cle) do nothing;
