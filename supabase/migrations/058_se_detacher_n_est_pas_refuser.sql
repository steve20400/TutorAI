-- Se détacher n'est pas refuser.
--
-- La migration 056 gardait la demande en « refusée » quand l'enfant coupait.
-- Comme `demander_rattachement` refuse dès qu'une demande existe entre deux
-- comptes, cet adulte ne pouvait plus jamais en envoyer une — silencieusement,
-- des deux côtés : son écran disait « demande envoyée », et rien n'arrivait.
--
-- C'était confondre deux gestes qui n'ont pas le même sens.
--
-- REFUSER une demande, c'est dire « je ne connais pas cette personne » à
-- quelqu'un qu'on n'a jamais accepté. Ce refus-là reste définitif et muet, et
-- rien ici n'y touche : c'est lui qui permet à un enfant de dire non une seule
-- fois sans que celui qui insiste apprenne qu'il faut s'y prendre autrement.
--
-- SE DÉTACHER, c'est défaire un lien qu'on avait accepté en connaissance de
-- cause. Les raisons ne nous regardent pas, et elles sont souvent banales : un
-- parent qui a cru s'être trompé d'enfant, un enfant qui a mal lu un prénom,
-- une main qui a glissé. Rendre ce geste irréversible obligeait à passer par
-- l'administration pour réparer une erreur de clic.
--
-- Les deux sens se valent donc désormais : côté adulte comme côté enfant, la
-- demande acceptée est effacée, et le rattachement peut se refaire par la
-- procédure normale — l'adulte demande, l'enfant reconnaît.
--
-- Une conséquence à connaître : une coupure ne compte plus dans le décompte
-- qui alerte l'administration. Seuls les vrais refus y entrent, ce qui est
-- cohérent — mais un adulte que plusieurs enfants détachent après coup ne
-- remonte plus. Si cela devient un signal utile, il faudra le compter à part.

begin;

drop function if exists couper_rattachement(uuid);
drop function if exists couper_rattachement(uuid, boolean);

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

  -- Effacée, et seulement celle-ci. Si cet adulte avait été refusé par le
  -- passé, ce refus-là reste en place et continue de le bloquer : on ne
  -- rouvre pas une porte que l'enfant avait fermée sans jamais l'ouvrir.
  delete from demandes_rattachement
   where adulte_id = adulte and eleve_id = moi and etat = 'acceptee';
end; $$;

revoke all on function couper_rattachement(uuid) from public, anon;
grant execute on function couper_rattachement(uuid) to authenticated;

commit;
