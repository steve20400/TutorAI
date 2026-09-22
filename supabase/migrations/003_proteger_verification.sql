-- =============================================================================
-- Migration 003 — un répétiteur ne peut pas s'auto-vérifier
--
-- Faille trouvée par le test « un repetiteur ne se declare PAS verifie
-- lui-meme ». La politique « le repetiteur modifie son profil » l'autorise à
-- modifier sa fiche, et sa fiche contient la colonne `statut`. Un appel direct
-- à l'API suffisait donc à passer de 'brouillon' à 'verifie' et à apparaître
-- dans l'annuaire des familles sans qu'aucune pièce n'ait été examinée.
--
-- La RLS ne sait pas dire « tu peux modifier ces colonnes mais pas celles-là »,
-- et les privilèges par colonne ne distinguent pas l'administrateur, qui porte
-- le même rôle Postgres que tout le monde. D'où ce déclencheur.
--
-- Il lève une exception au lieu d'ignorer en silence : un client légitime
-- renvoie le statut inchangé et ne le déclenche jamais, tandis qu'une
-- tentative réelle doit être bruyante.
-- =============================================================================

begin;

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
  -- Un visiteur non connecté, lui, est arrêté en amont : la politique exige
  -- `id = auth.uid()`, qui est faux quand l'identifiant est nul.
  if est_admin() or auth.uid() is null then
    return new;
  end if;

  if new.statut       is distinct from old.statut
  or new.verifie_le   is distinct from old.verifie_le
  or new.motif_refus  is distinct from old.motif_refus then
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
end;
$$;

drop trigger if exists sur_maj_repetiteur on repetiteurs;

create trigger sur_maj_repetiteur
  before update on repetiteurs
  for each row execute function proteger_verification_repetiteur();

commit;
