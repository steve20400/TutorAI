-- Un répétiteur ne pouvait pas soumettre sa fiche à l'examen.
--
-- La route `/v1/repetiteur/profil` fait passer la fiche en « en_attente » dès
-- qu'elle est complète, dans le même UPDATE que le reste, avec le jeton du
-- répétiteur. Or `proteger_verification_repetiteur` refusait tout changement
-- de `statut` à quiconque n'est pas administrateur.
--
-- Conséquence, jamais vue parce que personne n'avait parcouru ce chemin en
-- entier : au moment précis où un répétiteur finissait de remplir sa fiche,
-- l'enregistrement se mettait à échouer — pas seulement le statut, TOUT
-- l'enregistrement, puisque c'est une seule écriture. Il voyait « refusé »
-- sans comprendre, et aucune fiche n'atteignait jamais la pile de
-- l'administration. L'annuaire ne pouvait se remplir que par SQL.
--
-- Ce qui est permis ici est étroit : passer de « brouillon » ou « refuse » à
-- « en_attente », et rien d'autre. Se vérifier soi-même reste impossible, et
-- une fiche déjà vérifiée ne peut pas se remettre en attente.
create or replace function proteger_verification_repetiteur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- `auth.uid()` est nul hors d'une session utilisateur : migrations, tests,
  -- et travaux côté serveur avec la clé de service. Ces contextes ne passent
  -- déjà pas par la RLS ; ce déclencheur n'a pas à être plus strict qu'elle.
  if est_admin() or auth.uid() is null then
    return new;
  end if;

  -- Se présenter à l'examen est un acte du répétiteur. Le refuser revenait à
  -- lui demander de remplir un dossier que personne ne viendrait jamais lire.
  if auth.uid() = new.id
     and old.statut in ('brouillon', 'refuse')
     and new.statut = 'en_attente'
     and new.verifie_le is not distinct from old.verifie_le
  then
    -- Le motif du refus précédent n'a plus lieu d'être affiché une fois la
    -- fiche corrigée et resoumise.
    new.motif_refus := null;
  elsif new.statut      is distinct from old.statut
     or new.verifie_le  is distinct from old.verifie_le
     or new.motif_refus is distinct from old.motif_refus then
    raise exception
      'Seule l''administration peut modifier la vérification d''une fiche'
      using errcode = '42501';
  end if;

  -- Accepter le contrat en vigueur est un acte du répétiteur, mais il ne peut
  -- pas accepter d'avance une version qui n'existe pas encore : ce serait un
  -- moyen de rester visible après un changement de facturation sans l'avoir lu.
  new.version_contrat_acceptee := least(
    new.version_contrat_acceptee,
    (select version_contrat from facturation where id = 1)
  );

  return new;
end; $$;
