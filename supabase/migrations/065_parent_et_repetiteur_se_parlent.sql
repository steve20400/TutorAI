-- Un parent peut écrire à un répétiteur, et lui seul ouvre la conversation.
--
-- C'est le dernier bouton du canevas qui ne faisait rien : « Poser une
-- question », sur le dossier. Un parent doit pouvoir demander avant d'engager
-- — les disponibilités réelles, la façon de travailler, ce qu'il advient d'une
-- séance manquée.
--
-- Trois règles, et elles tiennent toutes à la même chose.
--
-- 1. SEUL LE PARENT OUVRE. Un répétiteur qui pourrait écrire le premier
--    démarcherait les familles de l'annuaire, et l'annuaire deviendrait une
--    liste d'adresses à prospecter. Il répond, il n'aborde pas.
--
-- 2. L'ENFANT N'Y EST PAS. Ni comme auteur, ni comme lecteur. La promesse du
--    produit est qu'un enfant n'est jamais seul avec un adulte ; lui ouvrir un
--    canal écrit vers un répétiteur la défait entièrement. Les séances, elles,
--    se tiennent dans la salle et sont enregistrées.
--
-- 3. L'ADMINISTRATION LIT. Pas par curiosité : un signalement sans les
--    messages est un signalement qu'on ne peut pas instruire. C'est écrit ici
--    plutôt que laissé à un accès de base qu'on oublierait de retirer.

begin;

create table if not exists conversations (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references profils(id) on delete cascade,
  repetiteur_id uuid not null references repetiteurs(id) on delete cascade,
  cree_le       timestamptz not null default now(),
  unique (parent_id, repetiteur_id)
);

create table if not exists messages_familles (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  auteur_id       uuid not null references profils(id) on delete cascade,
  texte           text not null check (length(btrim(texte)) between 1 and 4000),
  cree_le         timestamptz not null default now(),
  lu_le           timestamptz
);

create index if not exists messages_par_conversation
  on messages_familles (conversation_id, cree_le);

alter table conversations enable row level security;
alter table messages_familles enable row level security;

-- ── Qui voit ───────────────────────────────────────────────────────────────
drop policy if exists "les deux parties voient la conversation" on conversations;
create policy "les deux parties voient la conversation" on conversations
  for select to authenticated
  using (
    parent_id = auth.uid()
    or repetiteur_id = auth.uid()
    or est_admin()
  );

-- Seul le parent ouvre, et seulement vers un répétiteur vérifié : écrire à un
-- dossier non contrôlé reviendrait à contourner l'annuaire.
drop policy if exists "le parent ouvre la conversation" on conversations;
create policy "le parent ouvre la conversation" on conversations
  for insert to authenticated
  with check (
    parent_id = auth.uid()
    and exists (
      select 1 from profils where id = auth.uid() and role = 'parent'
    )
    and exists (
      select 1 from repetiteurs where id = repetiteur_id and statut = 'verifie'
    )
  );

drop policy if exists "les deux parties lisent les messages" on messages_familles;
create policy "les deux parties lisent les messages" on messages_familles
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
       where c.id = conversation_id
         and (c.parent_id = auth.uid() or c.repetiteur_id = auth.uid()
              or est_admin())
    )
  );

-- On n'écrit que dans sa propre conversation, et en son propre nom.
drop policy if exists "les deux parties ecrivent" on messages_familles;
create policy "les deux parties ecrivent" on messages_familles
  for insert to authenticated
  with check (
    auteur_id = auth.uid()
    and exists (
      select 1 from conversations c
       where c.id = conversation_id
         and (c.parent_id = auth.uid() or c.repetiteur_id = auth.uid())
    )
  );

-- Marquer comme lu est la seule modification permise, et seulement sur les
-- messages qu'on n'a pas écrits.
drop policy if exists "marquer lu" on messages_familles;
create policy "marquer lu" on messages_familles
  for update to authenticated
  using (
    auteur_id <> auth.uid()
    and exists (
      select 1 from conversations c
       where c.id = conversation_id
         and (c.parent_id = auth.uid() or c.repetiteur_id = auth.uid())
    )
  )
  with check (auteur_id <> auth.uid());

-- Personne n'efface. Un message qu'on peut retirer après coup ne prouve rien
-- le jour d'un signalement, et c'est ce jour-là qu'on le cherche.

-- ── Ouvrir, et écrire ──────────────────────────────────────────────────────
-- `ouvrir_conversation` rend l'existante plutôt que d'échouer sur la
-- contrainte d'unicité : le parent clique « Poser une question » une deuxième
-- fois trois semaines plus tard, et il reprend le fil.
create or replace function ouvrir_conversation(repetiteur uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  trouvee uuid;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if not exists (select 1 from profils where id = moi and role = 'parent') then
    raise exception 'Seul un compte adulte ouvre une conversation'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from repetiteurs where id = repetiteur and statut = 'verifie'
  ) then
    raise exception 'Ce répétiteur n''existe pas' using errcode = '42501';
  end if;

  select id into trouvee from conversations
   where parent_id = moi and repetiteur_id = repetiteur;

  if trouvee is not null then return trouvee; end if;

  insert into conversations (parent_id, repetiteur_id)
  values (moi, repetiteur)
  returning id into trouvee;

  return trouvee;
end; $$;

revoke all on function ouvrir_conversation(uuid) from public, anon;
grant execute on function ouvrir_conversation(uuid) to authenticated;

-- ── La liste des fils ──────────────────────────────────────────────────────
-- Chacun ne lit pas le profil de l'autre : la politique de `profils` ne donne
-- ni le répétiteur au parent, ni le parent au répétiteur. Cette fonction rend
-- le prénom, le nom et l'image de celui d'en face — ce qu'il faut pour
-- reconnaître un fil, et rien de plus. Ni téléphone, ni adresse : ils se
-- parlent ici, pas ailleurs.
create or replace function mes_conversations()
returns table (
  id uuid,
  autre_id uuid,
  prenom text,
  nom text,
  photo_url text,
  dernier_texte text,
  dernier_le timestamptz,
  non_lus integer
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         autre.id,
         autre.prenom,
         autre.nom,
         autre.photo_url,
         dernier.texte,
         dernier.cree_le,
         (select count(*) from messages_familles m
           where m.conversation_id = c.id
             and m.auteur_id <> auth.uid()
             and m.lu_le is null)::int
    from conversations c
    join profils autre
      on autre.id = case when c.parent_id = auth.uid()
                         then c.repetiteur_id else c.parent_id end
    left join lateral (
      select m.texte, m.cree_le from messages_familles m
       where m.conversation_id = c.id
       order by m.cree_le desc limit 1
    ) dernier on true
   where c.parent_id = auth.uid() or c.repetiteur_id = auth.uid()
   order by coalesce(dernier.cree_le, c.cree_le) desc;
$$;

revoke all on function mes_conversations() from public, anon;
grant execute on function mes_conversations() to authenticated;

-- Marquer lus les messages de l'autre, d'un coup.
create or replace function marquer_lus(conversation uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages_familles
     set lu_le = now()
   where conversation_id = conversation
     and auteur_id <> auth.uid()
     and lu_le is null
     and exists (
       select 1 from conversations c
        where c.id = conversation
          and (c.parent_id = auth.uid() or c.repetiteur_id = auth.uid())
     );
$$;

revoke all on function marquer_lus(uuid) from public, anon;
grant execute on function marquer_lus(uuid) to authenticated;

-- ── En direct ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages_familles'
  ) then
    alter publication supabase_realtime add table public.messages_familles;
  end if;
end $$;

commit;
