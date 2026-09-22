-- Un utilisateur pouvait se nommer administrateur lui-même.
--
-- La politique « modifier son profil » disait `using (id = auth.uid())` et
-- rien d'autre : le propriétaire de la ligne pouvait écrire n'importe laquelle
-- de ses colonnes, `role` comprise. Un parent connecté n'avait qu'à envoyer
--
--   PATCH /rest/v1/profils?identifiant=eq.LE_SIEN  {"role":"admin"}
--
-- avec la clé publique — qui est publique, c'est son rôle — pour obtenir
-- l'espace d'administration en entier. Ni le middleware ni la garde de page
-- n'y pouvaient quoi que ce soit : tous deux relisent `profils.role`, la
-- colonne que l'appelant venait de réécrire. Les trois verrous tournaient
-- autour de la même clé.
--
-- C'est la faute de 002 sur `repetiteurs.statut` à un autre endroit : le
-- formulaire ne proposait pas le champ, donc personne n'a pensé que le champ
-- était offert. Une interface qui n'affiche pas un champ ne le protège pas.
--
-- `identifiant` est verrouillé au passage. Il sert de nom de connexion à
-- l'administration (« GALILEE ») et il est unique : sans cela, un compte
-- supprimé libérerait son identifiant, et le suivant pourrait le reprendre.

create or replace function proteger_role_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- `auth.uid()` est nul quand l'inscription crée la ligne et quand les tests
  -- posent leurs fixtures en SQL. Ces deux cas passent : le trigger
  -- d'inscription décide déjà du rôle et refuse « admin ».
  if auth.uid() is null or est_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'Un compte ne se donne pas le rôle d''administrateur'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Seule l''administration peut changer le rôle d''un compte'
      using errcode = '42501';
  end if;

  if new.identifiant is distinct from old.identifiant then
    raise exception 'L''identifiant est attribué à l''inscription et ne se modifie pas'
      using errcode = '42501';
  end if;

  return new;
end; $$;

drop trigger if exists sur_ecriture_profil on profils;
create trigger sur_ecriture_profil
  before insert or update on profils
  for each row execute function proteger_role_profil();
