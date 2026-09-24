-- Alerter tous les dix refus, et non une seule fois.
--
-- La règle précédente n'alertait qu'au premier passage du seuil, et seulement
-- tant qu'aucune alerte n'était en attente. Deux défauts opposés : si
-- l'administration classait la première, le onzième refus en déclenchait
-- aussitôt une deuxième — et si elle ne la classait pas, le vingtième,
-- trentième, centième refus ne disaient plus rien.
--
-- Désormais : une alerte à dix, une à vingt, une à trente. Tant que le compte
-- n'est pas suspendu, chaque dizaine se signale — et le nombre grandit dans le
-- motif, ce qui dit d'un coup d'œil si la situation s'aggrave.
--
-- Le motif porte aussi les rattachements ACCEPTÉS. Dix refus pour un adulte
-- qui n'a jamais été reconnu par personne ne se lit pas comme dix refus pour
-- un parent que trois enfants ont reconnu : le premier cherche, le second
-- s'est trompé de nom.
create or replace function repondre_rattachement(demande uuid, oui boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d        demandes_rattachement;
  refus    int;
  acceptes int;
  plafond  int;
begin
  select * into d from demandes_rattachement
  where id = demande and eleve_id = auth.uid() and etat = 'en_attente';

  if d.id is null then
    raise exception 'Cette demande n''existe pas' using errcode = '42501';
  end if;

  if oui then
    update demandes_rattachement
       set etat = 'acceptee', repondu_le = now() where id = demande;

    insert into liens_familiaux (parent_id, eleve_id, actif_le)
    values (d.adulte_id, d.eleve_id, now() + interval '48 hours')
    on conflict (parent_id, eleve_id) do nothing;
    return;
  end if;

  -- Un refus ne se voit pas. La demande reste « en attente » du côté de
  -- l'adulte, pour toujours : refuser ne coûte rien à l'enfant, et celui qui
  -- essaie n'obtient aucun signal qui lui dirait de s'y prendre autrement.
  update demandes_rattachement
     set etat = 'refusee', repondu_le = now() where id = demande;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'refus_avant_signalement'), 10)
    into plafond;

  select count(*) filter (where etat = 'refusee'),
         count(*) filter (where etat = 'acceptee')
    into refus, acceptes
    from demandes_rattachement where adulte_id = d.adulte_id;

  -- À chaque dizaine pile, et pas entre deux.
  if plafond > 0 and refus % plafond = 0 then
    insert into signalements (auteur_id, cible_id, motif, statut)
    values (
      null,
      d.adulte_id,
      'Rattachements refusés : ' || refus || ' demandes refusées par des enfants'
        || case when acceptes > 0
             then ', pour ' || acceptes || ' acceptée(s).'
             else ', aucune acceptée.' end,
      'nouveau'
    );
  end if;
end; $$;

-- ── Ce que cet adulte a tenté ───────────────────────────────────────────────
-- Les comptes vivent déjà dans `demandes_rattachement` : les recopier dans des
-- colonnes créerait deux vérités, et le jour où elles divergent personne ne le
-- voit. On les calcule.
create or replace function tentatives_de_rattachement(adulte uuid)
returns table (refusees integer, acceptees integer, en_attente integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where etat = 'refusee')::int,
    count(*) filter (where etat = 'acceptee')::int,
    count(*) filter (where etat = 'en_attente')::int
  from demandes_rattachement
  where adulte_id = adulte and est_admin();
$$;

grant execute on function tentatives_de_rattachement(uuid) to authenticated;
