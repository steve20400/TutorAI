-- Compter les détachements, sans les confondre avec les refus.
--
-- Depuis la migration 058, un détachement n'entre plus dans le décompte qui
-- alerte l'administration — et c'est juste : refuser, c'est dire « je ne
-- reconnais pas cette personne » à quelqu'un qu'on n'a jamais accepté ; se
-- détacher, c'est défaire un lien qu'on avait accepté en connaissance de
-- cause. Mêler les deux ferait lire dix ruptures banales comme dix refus, et
-- ferait passer pour suspect un parent qui s'est trompé d'enfant une fois.
--
-- Mais ne rien compter du tout efface un signal réel. Un adulte que plusieurs
-- enfants DIFFÉRENTS retirent après l'avoir accepté est exactement ce qu'on
-- veut voir. Le geste n'est pas le même selon qui le fait :
--
--   par l'adulte  — il s'est trompé de nom, la famille a changé. Banal.
--   par l'enfant  — il a accepté, puis il a voulu que ça cesse. À regarder.
--
-- On garde donc la trace, et on distingue les deux sens. Aucune alerte
-- automatique : ce compteur informe celui qui ouvre un dossier, il ne
-- déclenche rien. Le jour où un seuil devient utile, les données seront là.
--
-- La ligne survit au lien qu'elle décrit : c'est tout son intérêt. Effacer
-- l'un en effaçant l'autre rendrait l'historique invisible au moment précis
-- où il servirait.

begin;

create table if not exists detachements (
  id        uuid primary key default gen_random_uuid(),
  adulte_id uuid not null references profils(id) on delete cascade,
  eleve_id  uuid not null references profils(id) on delete cascade,
  -- Qui a coupé. C'est la moitié de l'information.
  par       text not null check (par in ('adulte', 'enfant')),
  le        timestamptz not null default now()
);

create index if not exists detachements_par_adulte
  on detachements (adulte_id, le desc);

alter table detachements enable row level security;

-- Personne n'écrit directement : les deux fonctions ci-dessous s'en chargent,
-- et elles seules savent qui a coupé.
drop policy if exists "l'administration lit les detachements" on detachements;
create policy "l'administration lit les detachements" on detachements
  for select to authenticated
  using (est_admin());

-- ── L'adulte se retire ─────────────────────────────────────────────────────
create or replace function detacher_enfant(enfant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  existait boolean;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  delete from liens_familiaux
   where parent_id = moi and eleve_id = enfant
  returning true into existait;

  -- Rien à inscrire si rien n'a été défait : un double clic ne doit pas
  -- compter deux fois.
  if existait then
    insert into detachements (adulte_id, eleve_id, par)
    values (moi, enfant, 'adulte');
  end if;

  -- Sans cette ligne, se détacher serait sans retour :
  -- `demander_rattachement` refuse dès qu'une demande existe entre deux
  -- comptes, quel que soit son état.
  delete from demandes_rattachement
   where adulte_id = moi and eleve_id = enfant and etat = 'acceptee';
end; $$;

-- ── L'enfant coupe ─────────────────────────────────────────────────────────
create or replace function couper_rattachement(adulte uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  existait boolean;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  delete from liens_familiaux
   where eleve_id = moi and parent_id = adulte
  returning true into existait;

  if existait then
    insert into detachements (adulte_id, eleve_id, par)
    values (adulte, moi, 'enfant');
  end if;

  delete from demandes_rattachement
   where adulte_id = adulte and eleve_id = moi and etat = 'acceptee';
end; $$;

-- ── Ce que l'administration lit ────────────────────────────────────────────
-- Le type de retour change : Postgres exige qu'on la retire d'abord.
drop function if exists tentatives_de_rattachement(uuid);
create function tentatives_de_rattachement(adulte uuid)
returns table (
  refusees integer,
  acceptees integer,
  en_attente integer,
  -- Des ENFANTS distincts, et non des coupures : un même enfant qui se
  -- rattache et se détache trois fois reste un enfant, pas trois signaux.
  detaches_par_enfant integer,
  detaches_par_adulte integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) filter (where d.etat = 'refusee')
       from demandes_rattachement d where d.adulte_id = adulte)::int,
    (select count(*) filter (where d.etat = 'acceptee')
       from demandes_rattachement d where d.adulte_id = adulte)::int,
    (select count(*) filter (where d.etat = 'en_attente')
       from demandes_rattachement d where d.adulte_id = adulte)::int,
    (select count(distinct t.eleve_id) from detachements t
      where t.adulte_id = adulte and t.par = 'enfant')::int,
    (select count(distinct t.eleve_id) from detachements t
      where t.adulte_id = adulte and t.par = 'adulte')::int
  where est_admin();
$$;

grant execute on function tentatives_de_rattachement(uuid) to authenticated;

commit;
