-- Essayer le tuteur sans compte.
--
-- Quelqu'un entend parler de TUTELA, il veut voir. On lui ouvre la porte sans
-- rien lui demander — et c'est le seul endroit de la plateforme où un visiteur
-- anonyme fait dépenser de l'argent. D'où ce qui suit.
--
-- Rien de la conversation n'est gardé : elle vit dans son navigateur et
-- disparaît avec l'onglet. Ce qui est gardé ici, c'est uniquement ce qu'il a
-- consommé — parce que sans ce compteur, une seule personne peut vider un
-- crédit en une nuit.

-- Le sel qui brouille les adresses. Dans `cles_api`, donc lisible par la seule
-- administration : sans lui, l'empreinte d'une adresse IPv4 se retrouve en
-- quelques minutes, et on aurait stocké des adresses en croyant ne pas le
-- faire.
insert into cles_api (nom, valeur, publique, ordre) values
  ('sel_essai', encode(extensions.gen_random_bytes(32), 'hex'), false, 200)
on conflict (nom) do nothing;

create table if not exists essais (
  id         uuid primary key default gen_random_uuid(),
  /**
   * L'empreinte de l'adresse, jamais l'adresse.
   *
   * Elle ne sert qu'à empêcher qu'on relance cent essais d'affilée. Elle est
   * effacée avec la ligne, et la ligne ne vit que quelques heures.
   */
  empreinte  text not null,
  jetons     integer not null default 0,
  cree_le    timestamptz not null default now(),
  expire_le  timestamptz not null
);

create index if not exists essais_par_empreinte on essais (empreinte, cree_le desc);

alter table essais enable row level security;

-- Personne ne lit cette table. Seules les fonctions ci-dessous y touchent, et
-- elles contournent la RLS. On l'écrit, plutôt que de laisser un vide que
-- quelqu'un prendra pour un oubli.
drop policy if exists "personne ne lit les essais" on essais;
create policy "personne ne lit les essais" on essais
  for select to anon, authenticated using (false);

insert into parametres (cle, valeur, libelle) values
  ('essais_par_adresse_et_jour', '3'::jsonb,
   'Essais sans compte autorisés par adresse et par jour')
on conflict (cle) do nothing;

-- ── Ouvrir un essai ─────────────────────────────────────────────────────────
create or replace function ouvrir_essai(adresse text)
returns table (id uuid, jetons_restants integer, expire_le timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  sel     text;
  marque  text;
  plafond int;
  deja    int;
  minutes int;
  budget  int;
  nouvel  uuid;
  fin     timestamptz;
begin
  if not coalesce((select (valeur #>> '{}')::boolean from parametres
                    where cle = 'ia_active'), false) then
    raise exception 'Le tuteur n''est pas disponible' using errcode = '42501';
  end if;

  select valeur into sel from cles_api where nom = 'sel_essai';
  marque := encode(digest(coalesce(adresse, '?') || coalesce(sel, ''), 'sha256'), 'hex');

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'essais_par_adresse_et_jour'), 3) into plafond;

  select count(*) into deja from essais
   where empreinte = marque and cree_le > now() - interval '24 hours';

  if deja >= plafond then
    raise exception 'Tu as déjà essayé plusieurs fois aujourd''hui.'
      using errcode = '53400';
  end if;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'ia_minutes_essai'), 45) into minutes;
  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'ia_jetons_essai'), 25000) into budget;

  fin := now() + make_interval(mins => minutes);

  insert into essais (empreinte, expire_le) values (marque, fin)
  returning essais.id into nouvel;

  -- On efface en passant ce qui a expiré depuis longtemps : pas de tâche de
  -- ménage à programmer, et l'empreinte ne survit pas à ce qu'elle protège.
  delete from essais e where e.expire_le < now() - interval '24 hours';

  return query select nouvel, budget, fin;
end; $$;

-- ── Dépenser ────────────────────────────────────────────────────────────────
-- Appelée AVANT l'appel au modèle pour vérifier, et APRÈS pour inscrire. Les
-- deux en une fois : on réserve d'abord, on ajuste ensuite. Vérifier puis
-- appeler laisserait passer deux requêtes simultanées sur le dernier jeton.
create or replace function consommer_essai(essai uuid, jetons_ajoutes integer)
returns table (jetons_restants integer, expire_le timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  ligne  essais;
  budget int;
begin
  select * into ligne from essais where essais.id = essai for update;

  if ligne.id is null then
    raise exception 'Cet essai n''existe plus' using errcode = '42501';
  end if;

  if ligne.expire_le < now() then
    raise exception 'Cet essai est terminé' using errcode = '53400';
  end if;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'ia_jetons_essai'), 25000) into budget;

  if ligne.jetons >= budget then
    raise exception 'Cet essai est terminé' using errcode = '53400';
  end if;

  update essais set jetons = essais.jetons + greatest(jetons_ajoutes, 0)
   where essais.id = essai
  returning budget - essais.jetons, essais.expire_le
    into jetons_restants, expire_le;

  return next;
end; $$;

grant execute on function ouvrir_essai(text) to anon, authenticated;
grant execute on function consommer_essai(uuid, integer) to anon, authenticated;
