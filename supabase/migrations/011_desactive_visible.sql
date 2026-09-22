-- La désactivation ne sortait pas le répétiteur de l'annuaire.
--
-- La politique posée en 010 demandait :
--
--   not exists (select 1 from profils p
--               where p.id = repetiteurs.id and p.desactive_le is not null)
--
-- Ce sous-select est lui-même soumis à RLS. Un parent ne peut lire que son
-- propre profil et celui de ses enfants : la ligne du répétiteur lui est
-- invisible, `exists` est donc toujours faux, et `not exists` toujours vrai.
-- La fiche restait dans l'annuaire — exactement le contraire de ce que la
-- désactivation doit produire, et le seul cas où l'erreur compte vraiment.
--
-- C'est le piège ordinaire des politiques qui interrogent une autre table
-- protégée : elles lisent avec les droits de l'appelant, pas avec ceux du
-- système. Il faut une fonction `security definer`, comme `est_admin()` et
-- `repetiteur_a_jour()` plus haut, qui répond sur la base réelle.
create or replace function compte_desactive(qui uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profils where id = qui and desactive_le is not null
  );
$$;

drop policy if exists "un parent voit les repetiteurs verifies" on repetiteurs;
create policy "un parent voit les repetiteurs verifies" on repetiteurs
  for select using (
    id = auth.uid()
    or est_admin()
    or (
      statut = 'verifie'
      and repetiteur_a_jour(id)
      and not compte_desactive(id)
    )
  );
