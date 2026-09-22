-- Ajouter une politique n'a jamais rien restreint.
--
-- 010 puis 011 ont posé « un parent voit les repetiteurs verifies » en pensant
-- fermer l'annuaire aux comptes désactivés. La fiche y restait pourtant.
--
-- Les politiques permissives de Postgres se combinent en OU. `repetiteurs`
-- portait déjà « les familles voient les repetiteurs verifies et a jour », qui
-- ne sait rien de la désactivation : il suffisait qu'elle réponde oui pour que
-- la fiche passe, quelle que soit la nouvelle politique posée à côté.
--
-- C'est la leçon à retenir de cet épisode : une politique de plus ÉLARGIT
-- toujours l'accès, jamais l'inverse. Pour restreindre, il faut modifier celle
-- qui autorise déjà — ou n'en garder qu'une.
--
-- D'où le choix ici : une seule politique de lecture, qui dit tout. Trois
-- portes vers la même pièce, c'est trois endroits où se tromper, et deux
-- qu'on oubliera de mettre à jour la prochaine fois.
drop policy if exists "un parent voit les repetiteurs verifies" on repetiteurs;
drop policy if exists "les familles voient les repetiteurs verifies et a jour" on repetiteurs;
drop policy if exists "le repetiteur lit son profil" on repetiteurs;

create policy "qui voit une fiche de repetiteur" on repetiteurs
  for select using (
    -- Le répétiteur, toujours : il doit pouvoir relire sa fiche même refusée,
    -- sinon il ne peut pas la corriger.
    id = auth.uid()
    -- L'administration, toujours : c'est son travail de voir les dossiers.
    or est_admin()
    -- Les familles : une fiche vérifiée, à jour de sa redevance, dont le
    -- contrat en vigueur a été accepté, et dont le compte n'est pas désactivé.
    or (
      statut = 'verifie'
      and repetiteur_a_jour(id)
      and version_contrat_acceptee >= (
        select version_contrat from facturation where id = 1
      )
      and not compte_desactive(id)
    )
  );
