-- De quel modèle vient la réponse, et où le demander.
--
-- Rien de tout cela n'est écrit dans le code. Le jour où Steve met sa propre
-- machine en service, ou change d'Anthropic à Gemini parce que l'un coûte
-- moins cher que l'autre, il change une ligne depuis son espace — il ne
-- redéploie pas.
--
-- C'est la même raison qui avait sorti la liste des villes du code : une
-- valeur en dur est une valeur que l'administration ne peut pas corriger.

-- ── Les clés ────────────────────────────────────────────────────────────────
-- `anthropic` existe déjà. On ajoute les deux autres.
insert into cles_api (nom, valeur, publique, apercu) values
  ('gemini', '', false, null),
  -- « Compatible » plutôt qu'« OpenAI » : c'est le protocole qui compte, pas
  -- la maison. vLLM, Ollama et llama.cpp le parlent tous — écrire cet
  -- adaptateur, c'est couvrir d'un coup OpenAI et la future machine d'ici.
  ('ia_compatible', '', false, null)
on conflict (nom) do nothing;

-- L'adresse du serveur compatible. Publique : ce n'est pas un secret, et
-- l'administration doit la voir en clair pour la corriger.
insert into cles_api (nom, valeur, publique, apercu) values
  ('ia_compatible_url', '', true, null)
on conflict (nom) do nothing;

-- ── Les réglages ────────────────────────────────────────────────────────────
insert into parametres (cle, valeur, libelle) values
  ('ia_fournisseur', '"anthropic"'::jsonb,
   'Fournisseur du tuteur — anthropic, gemini ou compatible'),

  -- Deux modèles, parce que les deux publics ne coûtent pas la même chose.
  -- Personne ne voit jamais ces noms dans l'interface : c'est ce qui permet
  -- d'en changer sans que quiconque s'en aperçoive.
  ('ia_modele_essai', '"claude-haiku-4-5-20251001"'::jsonb,
   'Modèle servi à qui essaie sans compte — le moins cher'),
  ('ia_modele_compte', '"claude-haiku-4-5-20251001"'::jsonb,
   'Modèle servi aux comptes'),

  -- Deux exercices de mathématiques, historique compris. Le chiffre sera
  -- corrigé quand on aura mesuré pour de vrai plutôt que raisonné.
  ('ia_jetons_essai', '25000'::jsonb,
   'Jetons accordés à une session d''essai sans compte'),
  ('ia_minutes_essai', '45'::jsonb,
   'Durée de vie d''une session d''essai, en minutes'),

  -- L'enfant qui s'inscrit seul : une dotation ET une échéance, le premier
  -- atteint des deux. La dotation seule se garde indéfiniment ; l'échéance
  -- seule laisse un usage illimité jusqu'au dernier jour.
  ('ia_jetons_enfant_seul', '150000'::jsonb,
   'Jetons accordés à un enfant tant qu''aucun adulte ne lui est rattaché'),
  ('ia_jours_enfant_seul', '10'::jsonb,
   'Jours accordés à un enfant tant qu''aucun adulte ne lui est rattaché')
on conflict (cle) do nothing;
