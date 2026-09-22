-- Désactiver un compte, jamais le supprimer.
--
-- Supprimer efface aussi ce qui permet de comprendre plus tard : qui a vérifié
-- ce répétiteur, quelles séances il a données, ce qu'un parent avait signalé.
-- Sur un produit dont la promesse est qu'une trace subsiste, effacer l'auteur
-- d'une séance reviendrait à effacer la séance.
--
-- Trois gestes, et les trois comptent :
--
--   1. `profils.desactive_le` sort le compte des écrans.
--   2. `auth.users.banned_until` empêche GoTrue de rouvrir une session. Sans
--      lui, le compte se reconnecte et retrouve tout.
--   3. La suppression des sessions ouvertes le met dehors TOUT DE SUITE. Sans
--      elle, un répétiteur écarté garde son onglet ouvert et peut rejoindre la
--      séance de l'après-midi : c'est précisément le cas où l'on désactive en
--      urgence, et attendre l'expiration du jeton n'est pas une option.
alter table profils add column if not exists desactive_le timestamptz;
alter table profils add column if not exists desactive_par uuid references profils (id);
alter table profils add column if not exists motif_desactivation text;

-- Un répétiteur désactivé quitte l'annuaire, quoi qu'en dise son statut de
-- vérification. La politique de lecture des fiches en tient compte.
drop policy if exists "un parent voit les repetiteurs verifies" on repetiteurs;
create policy "un parent voit les repetiteurs verifies" on repetiteurs
  for select using (
    id = auth.uid()
    or est_admin()
    or (
      statut = 'verifie'
      and repetiteur_a_jour(id)
      and not exists (
        select 1 from profils p
        where p.id = repetiteurs.id and p.desactive_le is not null
      )
    )
  );

create or replace function desactiver_compte(cible uuid, motif text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Seule l''administration désactive un compte'
      using errcode = '42501';
  end if;

  -- Se désactiver soi-même fermerait la porte de l'administration derrière le
  -- dernier administrateur, sans personne pour la rouvrir.
  if cible = auth.uid() then
    raise exception 'Un administrateur ne se désactive pas lui-même'
      using errcode = '42501';
  end if;

  update profils set
    desactive_le = now(),
    desactive_par = auth.uid(),
    motif_desactivation = nullif(trim(motif), '')
  where id = cible;

  if not found then
    raise exception 'Compte inconnu';
  end if;

  -- Cent ans, et non `infinity` : GoTrue lit cette colonne dans un type date
  -- de son langage, où l'infini n'existe pas. Avec `infinity`, le service
  -- echoue au scan de la ligne et repond « Database error querying schema » —
  -- une erreur 500 indistinguable d'une panne, alors qu'un compte desactive
  -- doit recevoir un refus propre.
  update auth.users set banned_until = now() + interval '100 years'
  where id = cible;
  delete from auth.sessions where user_id = cible;

  insert into journal_admin (admin_id, action, cible_type, cible_id, motif)
  values (auth.uid(), 'desactivation', 'compte', cible::text,
          nullif(trim(motif), ''));
end; $$;

create or replace function reactiver_compte(cible uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Seule l''administration réactive un compte'
      using errcode = '42501';
  end if;

  update profils set
    desactive_le = null,
    desactive_par = null,
    motif_desactivation = null
  where id = cible;

  if not found then
    raise exception 'Compte inconnu';
  end if;

  update auth.users set banned_until = null where id = cible;

  insert into journal_admin (admin_id, action, cible_type, cible_id)
  values (auth.uid(), 'reactivation', 'compte', cible::text);
end; $$;

revoke all on function desactiver_compte(uuid, text) from public, anon;
revoke all on function reactiver_compte(uuid) from public, anon;
