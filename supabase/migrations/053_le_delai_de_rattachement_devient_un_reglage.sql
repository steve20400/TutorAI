-- Les quarante-huit heures sortent du code.
--
-- Elles y étaient écrites en dur depuis la migration 029 :
--
--     values (d.adulte_id, d.eleve_id, now() + interval '48 hours')
--
-- Rien dans Postgres ne les imposait. C'était un ordre de grandeur choisi au
-- moment du dessin, jamais calculé, et personne ne pouvait le changer sans une
-- migration et un redéploiement.
--
-- À quoi servait ce délai : quand un nouvel adulte se rattache, les adultes
-- déjà en place ont le temps de s'y opposer avant qu'il ait du pouvoir sur
-- l'enfant. C'est réel — mais seulement s'il y a quelqu'un pour s'opposer.
-- Quand l'adulte est le seul rattaché, le délai ne protège personne : il
-- empêche juste l'enfant de récupérer son mot de passe pendant deux jours,
-- sans recours, puisqu'il ne peut pas non plus couper un rattachement.
--
-- Steve tranche pour zéro : dès que l'enfant a reconnu l'adulte, le lien est
-- plein. La reconnaissance — le prénom et la photo, que l'enfant seul valide —
-- redevient la seule barrière, avec le signalement automatique tous les dix
-- refus qui reste en place.
--
-- Le réglage demeure : le jour où il voudra remettre un délai, ce sera depuis
-- son espace, sans toucher à ceci.

begin;

insert into parametres (cle, valeur, libelle) values
  ('delai_rattachement_heures', '0'::jsonb,
   'Délai avant qu''un rattachement accepté devienne plein, en heures — 0 pour immédiat')
on conflict (cle) do nothing;

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
  heures   int;
begin
  select * into d from demandes_rattachement
  where id = demande and eleve_id = auth.uid() and etat = 'en_attente';

  if d.id is null then
    raise exception 'Cette demande n''existe pas' using errcode = '42501';
  end if;

  if oui then
    update demandes_rattachement
       set etat = 'acceptee', repondu_le = now() where id = demande;

    select coalesce((select (valeur #>> '{}')::int from parametres
                      where cle = 'delai_rattachement_heures'), 0)
      into heures;

    insert into liens_familiaux (parent_id, eleve_id, actif_le)
    values (d.adulte_id, d.eleve_id, now() + make_interval(hours => heures))
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

-- Les liens déjà posés attendent encore leurs quarante-huit heures. Les
-- laisser ainsi ferait cohabiter deux règles : l'enfant rattaché hier resterait
-- bloqué au nom d'une règle qui n'existe plus. On les ouvre.
update liens_familiaux set actif_le = now() where actif_le > now();

commit;
