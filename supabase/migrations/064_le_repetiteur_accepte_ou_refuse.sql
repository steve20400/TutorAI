-- Un répétiteur n'est pas engagé sans l'avoir dit.
--
-- Le parent crée le contrat, le répétiteur le voit — et n'a aucun moyen de
-- répondre. Il se retrouvait donc avec des élèves sans jamais avoir accepté.
--
-- C'est la seule place du produit où celui qui reçoit n'a pas son mot à dire.
-- Partout ailleurs, le consentement est la mécanique : l'enfant reconnaît
-- l'adulte avant qu'un lien existe, l'adulte peut se détacher, l'enfant peut
-- couper. Un répétiteur à qui on assigne des familles serait l'exception — et
-- ce serait aussi une promesse intenable envers le parent, qui croirait avoir
-- un répétiteur alors qu'il a une ligne dans une table.
--
-- Trois états au lieu d'un drapeau : proposé, accepté, refusé. Et `termine`
-- pour la fin, que le parent seul décide.
--
-- Un refus n'est pas silencieux ici, contrairement à celui d'un enfant. Les
-- raisons diffèrent : un enfant qui refuse un adulte se protège de quelqu'un
-- qui ne devrait pas insister, et le silence le protège. Un répétiteur qui
-- refuse un élève est un professionnel qui n'a pas la disponibilité — le
-- parent doit l'apprendre pour chercher ailleurs, sinon il attend.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'statut_contrat') then
    create type statut_contrat as enum
      ('propose', 'accepte', 'refuse', 'termine');
  end if;
end $$;

alter table contrats
  add column if not exists statut statut_contrat not null default 'propose';

alter table contrats
  add column if not exists repondu_le timestamptz;

-- Les contrats d'avant cette migration n'ont jamais été proposés à personne :
-- ils ont été créés à la main, du temps où la question ne se posait pas. Les
-- laisser « proposés » ferait apparaître de vieilles demandes à répondre.
update contrats set statut = 'accepte' where repondu_le is null and statut = 'propose'
  and cree_le < now();

-- ── Qui peut changer quoi ──────────────────────────────────────────────────
-- Le parent garde la main sur le contrat lui-même — la matière, le tarif, la
-- fréquence — mais pas sur la réponse : il ne s'accepte pas tout seul.
create or replace function proteger_reponse_contrat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if est_admin() or auth.uid() is null then
    return new;
  end if;

  -- `repondre_contrat()` passe par ici aussi : elle pose un témoin le temps
  -- de l'écriture, parce qu'elle a déjà vérifié qui répond et à quoi.
  if current_setting('tutela.reponse_contrat', true) = 'oui' then
    return new;
  end if;

  if new.statut is distinct from old.statut
  or new.repondu_le is distinct from old.repondu_le then
    -- Une seule exception : le parent met fin à un contrat accepté.
    if not (
      new.parent_id = auth.uid()
      and old.statut = 'accepte'
      and new.statut = 'termine'
    ) then
      raise exception
        'Seul le répétiteur répond à une proposition de contrat'
        using errcode = '42501';
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists proteger_reponse_contrat on contrats;
create trigger proteger_reponse_contrat
  before update on contrats
  for each row execute function proteger_reponse_contrat();

-- ── La réponse ─────────────────────────────────────────────────────────────
create or replace function repondre_contrat(contrat uuid, oui boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  trouve uuid;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  select id into trouve from contrats
   where id = contrat and repetiteur_id = moi and statut = 'propose';

  if trouve is null then
    -- Même réponse pour « ce contrat n'existe pas », « il ne vous concerne
    -- pas » et « vous avez déjà répondu » : les distinguer apprendrait à
    -- qui essaie des identifiants lesquels existent.
    raise exception 'Cette proposition n''existe pas' using errcode = '42501';
  end if;

  perform set_config('tutela.reponse_contrat', 'oui', true);

  update contrats
     set statut = case when oui then 'accepte' else 'refuse' end::statut_contrat,
         repondu_le = now()
   where id = contrat;

  perform set_config('tutela.reponse_contrat', '', true);
end; $$;

-- ── Ce que le répétiteur voit avant de répondre ────────────────────────────
-- Le prénom seul, et pas le nom.
--
-- La politique de lecture de `profils` ne lui donne de toute façon rien d'un
-- élève, et c'est tant mieux : un répétiteur qui refuse dix propositions
-- repartirait sinon avec dix identités complètes d'enfants. Le prénom et la
-- matière suffisent à décider si l'on a la disponibilité.
create or replace function mes_propositions()
returns table (
  id uuid,
  matiere text,
  tarif integer,
  frequence text,
  prenom text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.matiere, c.tarif, c.frequence, p.prenom
    from contrats c
    join profils p on p.id = c.eleve_id
   where c.repetiteur_id = auth.uid()
     and c.statut = 'propose'
   order by c.cree_le;
$$;

revoke all on function mes_propositions() from public, anon;
grant execute on function mes_propositions() to authenticated;

revoke all on function repondre_contrat(uuid, boolean) from public, anon;
grant execute on function repondre_contrat(uuid, boolean) to authenticated;

-- ── En direct ──────────────────────────────────────────────────────────────
-- Une proposition doit apparaître sous les yeux du répétiteur, et sa réponse
-- sous ceux du parent. La politique de lecture existe déjà des deux côtés —
-- « qui voit un contrat » — donc Realtime ne montrera à chacun que ses lignes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'contrats'
  ) then
    alter publication supabase_realtime add table public.contrats;
  end if;
end $$;

commit;
