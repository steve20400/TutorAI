-- L'adresse d'un compte, pour l'administration seule.
--
-- `profils` ne porte pas l'adresse : elle vit dans `auth.users`, que PostgREST
-- n'expose pas avec la clé publiable. L'écran d'une famille montrait donc un
-- téléphone et rien d'autre — or contacter un parent par écrit est souvent le
-- seul moyen de régler quelque chose, et c'est par écrit qu'on garde une
-- trace.
--
-- `security definer` parce qu'il n'y a pas d'autre chemin : aucune politique
-- ne peut ouvrir `auth.users`, c'est le schéma de GoTrue. La fonction est donc
-- la porte, et elle vérifie elle-même qui frappe.
--
-- Réservée à l'administration. Ouvrir les adresses à tout compte connecté
-- donnerait un annuaire d'emails à qui s'inscrit — sur une plateforme où des
-- mineurs ont un compte, c'est exactement ce qu'il ne faut pas.
--
-- Une adresse interne d'élève (@eleves.tutela.cm) ne sort jamais : elle
-- n'existe que pour satisfaire GoTrue, personne ne la relève, et l'afficher
-- laisserait croire qu'on peut écrire à un enfant.
create or replace function courriel_du_compte(cible uuid)
returns text language plpgsql security definer stable
set search_path = public, auth as $$
declare
  adresse text;
begin
  if not est_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;

  select u.email into adresse from auth.users u where u.id = cible;

  if adresse like '%@eleves.tutela.cm' then
    return null;
  end if;

  return adresse;
end; $$;

revoke all on function courriel_du_compte(uuid) from public, anon;
