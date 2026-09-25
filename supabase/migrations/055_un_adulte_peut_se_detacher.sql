-- Un adulte peut se détacher d'un enfant.
--
-- Il n'y avait aucune sortie. On tape un nom de connexion de travers, l'enfant
-- de quelqu'un d'autre reconnaît un prénom qui ressemble au sien et accepte —
-- et voilà deux comptes liés pour toujours, avec un enfant qui peut dépenser
-- les jetons d'un inconnu. Le lien se posait, rien ne le défaisait.
--
-- Le sens de la porte compte. C'est l'adulte qui se retire, pas lui qui
-- retire l'enfant : il n'agit que sur son propre lien, et rien de ce que
-- l'enfant possède n'est touché. Ses séances, son registre, son compte
-- restent à lui.
--
-- Ce que le détachement emporte : l'accès de cet adulte au dossier de
-- l'enfant, sa capacité à lui reposer un mot de passe, et sa place parmi ceux
-- qui peuvent payer ses séances. `payeur_pour` retombe toute seule sur un
-- autre adulte pourvu, ou sur la dotation de l'élève — il n'y a donc rien à
-- réassigner ici.

begin;

create or replace function detacher_enfant(enfant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  -- `parent_id = moi` est toute la sécurité : on ne peut défaire que son
  -- propre lien, jamais celui d'un autre adulte de la famille.
  delete from liens_familiaux where parent_id = moi and eleve_id = enfant;

  -- Sans cette seconde ligne, se détacher serait sans retour.
  -- `demander_rattachement` refuse dès qu'une demande existe entre ces deux
  -- comptes, quel que soit son état : la demande acceptée d'hier
  -- interdirait la demande d'aujourd'hui, en silence, et l'adulte ne
  -- comprendrait pas pourquoi son écran ne fait rien.
  --
  -- On n'efface que les siennes, et seulement celles qui avaient été
  -- acceptées. Un refus reste bloquant pour toujours : c'est lui qui rend le
  -- « non » d'un enfant définitif sans qu'il ait à le répéter.
  delete from demandes_rattachement
   where adulte_id = moi and eleve_id = enfant and etat = 'acceptee';
end; $$;

revoke all on function detacher_enfant(uuid) from public, anon;
grant execute on function detacher_enfant(uuid) to authenticated;

commit;
