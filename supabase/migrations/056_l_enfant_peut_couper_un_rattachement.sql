-- L'enfant peut couper un rattachement.
--
-- L'adulte pouvait se retirer depuis la migration 055. L'enfant, non — et
-- c'est pourtant le sens qui protège. Un enfant qui a dit oui trop vite, à un
-- prénom qui ressemblait à celui d'une tante, n'avait aucun moyen de revenir
-- dessus : l'adulte voyait son travail, pouvait lui reposer son mot de passe,
-- et le seul recours était d'abandonner le compte.
--
-- Les deux portes ne sont pas symétriques, et c'est voulu.
--
-- Quand l'ADULTE se retire, sa demande acceptée est effacée : il est parti de
-- lui-même, il peut redemander, et ce sera encore à l'enfant de décider.
--
-- Quand l'ENFANT coupe, la demande reste — et comme `demander_rattachement`
-- refuse dès qu'une demande existe entre deux comptes, cet adulte ne pourra
-- plus jamais en envoyer une. Silencieusement : son écran fera comme si de
-- rien n'était, exactement comme pour un refus. C'est ce qui rend le « non »
-- d'un enfant définitif sans qu'il ait à le répéter, et sans que celui qui
-- insiste apprenne qu'il faut s'y prendre autrement.
--
-- La coupure compte aussi comme un refus dans le décompte qui alerte
-- l'administration. Un adulte que plusieurs enfants ont écarté après coup est
-- exactement ce qu'on veut voir remonter.

begin;

-- ── Le décompte, sorti de repondre_rattachement pour être appelé des deux ──
create or replace function signaler_si_trop_de_refus(adulte uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  refus    int;
  acceptes int;
  plafond  int;
begin
  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'refus_avant_signalement'), 10)
    into plafond;

  select count(*) filter (where etat = 'refusee'),
         count(*) filter (where etat = 'acceptee')
    into refus, acceptes
    from demandes_rattachement where adulte_id = adulte;

  -- À chaque dizaine pile, et pas entre deux.
  if plafond > 0 and refus > 0 and refus % plafond = 0 then
    insert into signalements (auteur_id, cible_id, motif, statut)
    values (
      null,
      adulte,
      'Rattachements refusés : ' || refus || ' demandes refusées par des enfants'
        || case when acceptes > 0
             then ', pour ' || acceptes || ' acceptée(s).'
             else ', aucune acceptée.' end,
      'nouveau'
    );
  end if;
end; $$;

-- ── La coupure ─────────────────────────────────────────────────────────────
create or replace function couper_rattachement(adulte uuid)
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

  -- `eleve_id = moi` est toute la sécurité : un enfant ne coupe que ses
  -- propres liens, jamais ceux d'un autre enfant.
  delete from liens_familiaux where eleve_id = moi and parent_id = adulte;

  -- La demande passe de « acceptée » à « refusée ». Elle reste en place, donc
  -- elle continue de bloquer toute nouvelle demande de cet adulte.
  update demandes_rattachement
     set etat = 'refusee', repondu_le = now()
   where adulte_id = adulte and eleve_id = moi and etat = 'acceptee';

  perform signaler_si_trop_de_refus(adulte);
end; $$;

revoke all on function couper_rattachement(uuid) from public, anon;
grant execute on function couper_rattachement(uuid) to authenticated;

revoke all on function signaler_si_trop_de_refus(uuid) from public, anon, authenticated;

commit;
