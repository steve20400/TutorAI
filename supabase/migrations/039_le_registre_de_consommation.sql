-- Ce que chaque réponse du tuteur a coûté.
--
-- Sans ce registre, Steve fixera un jour un prix d'abonnement au doigt
-- mouillé. Avec lui, il le fixera sur des chiffres mesurés — et il verra
-- venir la dérive avant la facture.
--
-- Une ligne par appel, jamais agrégée : on peut toujours additionner des
-- lignes, on ne peut jamais retrouver le détail d'une somme.
create table if not exists consommation_ia (
  id            bigserial primary key,
  /** Qui a parlé au tuteur. */
  compte_id     uuid references profils(id) on delete set null,
  /**
   * Qui porte le coût. Aujourd'hui le même que `compte_id` ; demain l'adulte
   * qui fournit les jetons de l'enfant. La colonne existe dès maintenant pour
   * que l'historique reste lisible quand le porte-monnaie s'allumera.
   */
  paye_par      uuid references profils(id) on delete set null,
  seance_id     uuid references seances(id) on delete set null,
  fournisseur   text not null,
  modele        text not null,
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  /**
   * Vrai quand le fournisseur n'a pas compté et qu'on a estimé à sa place —
   * un modèle qu'on héberge soi-même, souvent. Facturer un jour sur une
   * estimation en croyant facturer sur une mesure serait pire que de ne pas
   * facturer.
   */
  approximatif  boolean not null default false,
  cree_le       timestamptz not null default now()
);

create index if not exists consommation_ia_par_compte
  on consommation_ia (compte_id, cree_le desc);
create index if not exists consommation_ia_par_payeur
  on consommation_ia (paye_par, cree_le desc);

alter table consommation_ia enable row level security;

-- Chacun voit ce qu'il a consommé, l'adulte ce qu'il paie, l'administration
-- tout. Personne n'écrit.
drop policy if exists "voir sa consommation" on consommation_ia;
create policy "voir sa consommation" on consommation_ia
  for select to authenticated
  using (
    compte_id = auth.uid()
    or paye_par = auth.uid()
    or est_mon_enfant(compte_id)
    or est_admin()
  );

-- ── Qui écrit ───────────────────────────────────────────────────────────────
-- Personne, sauf le service, et par sa connexion dédiée.
--
-- Si le site écrivait ces lignes avec le jeton de l'élève, l'élève pourrait
-- les écrire lui-même — et minorer sa consommation. Le jour où un abonnement
-- repose là-dessus, ce serait la porte ouverte.
--
-- Le rôle `service_ia` a déjà une connexion pour lire la clé du fournisseur.
-- Il gagne le droit d'ajouter ici, et rien d'autre : il ne peut ni relire, ni
-- modifier, ni effacer ce registre.
grant insert on consommation_ia to service_ia;
grant usage, select on sequence consommation_ia_id_seq to service_ia;

-- Le droit d'insérer ne suffit pas : la RLS s'applique à ce rôle comme à tout
-- le monde, et une table sans politique d'insertion refuse tout le monde.
-- Celle-ci le nomme, et ne vaut que pour lui.
drop policy if exists "le service inscrit la consommation" on consommation_ia;
create policy "le service inscrit la consommation" on consommation_ia
  for insert to service_ia
  with check (true);
