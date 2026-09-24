-- La durée d'une demande de mot de passe devient un réglage.
--
-- Elle était de dix minutes dans l'application, alors que le lien envoyé par
-- Supabase en vaut soixante. Deux canaux pour un même besoin qui expirent à
-- des moments différents, c'est une confusion garantie : le parent ouvre son
-- courriel, le lien marche, il va dans l'application et la zone est
-- verrouillée — sans que rien n'explique pourquoi.
--
-- En base, et non en dur : le jour où Steve hébergera Supabase sur sa propre
-- machine, il réglera GoTrue à dix minutes et changera cette valeur depuis son
-- espace. Les deux resteront d'accord sans redéploiement.
insert into parametres (cle, valeur, libelle) values
  ('duree_demande_mot_de_passe_minutes', '60'::jsonb,
   'Durée d''une demande de mot de passe, en minutes — à aligner sur le réglage de Supabase')
on conflict (cle) do nothing;

alter table demandes_mot_de_passe alter column expire_le drop default;

create or replace function demander_nouveau_mot_de_passe(nom_enfant text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  enfant  uuid;
  minutes int;
begin
  select id into enfant from profils
   where lower(identifiant) = normaliser_identifiant(nom_enfant)
     and role = 'eleve';

  if enfant is null then return; end if;

  if not exists (
    select 1 from liens_familiaux
     where eleve_id = enfant and actif_le <= now()
  ) then
    return;
  end if;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'duree_demande_mot_de_passe_minutes'), 60)
    into minutes;

  -- La précédente se ferme, toujours : c'est ce qui fait de « redemander » un
  -- renvoi et non une accumulation.
  update demandes_mot_de_passe
     set expire_le = now()
   where eleve_id = enfant and utilise_le is null and expire_le > now();

  insert into demandes_mot_de_passe (eleve_id, expire_le)
  values (enfant, now() + make_interval(mins => minutes));
end; $$;

create or replace function renvoyer_demande_mot_de_passe(enfant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi     uuid := auth.uid();
  minutes int;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if not exists (
    select 1 from liens_familiaux
     where parent_id = moi and eleve_id = enfant and actif_le <= now()
  ) and not est_admin() then
    raise exception 'Cet enfant ne vous est pas rattaché' using errcode = '42501';
  end if;

  select coalesce((select (valeur #>> '{}')::int from parametres
                    where cle = 'duree_demande_mot_de_passe_minutes'), 60)
    into minutes;

  update demandes_mot_de_passe
     set expire_le = now()
   where eleve_id = enfant and utilise_le is null and expire_le > now();

  insert into demandes_mot_de_passe (eleve_id, expire_le)
  values (enfant, now() + make_interval(mins => minutes));
end; $$;

-- La fenêtre où une demande close reste affichée suit la durée : sinon, avec
-- soixante minutes de validité et une heure d'affichage, la carte
-- disparaîtrait au moment même où elle se verrouille.
drop function if exists demandes_de_mot_de_passe();
create function demandes_de_mot_de_passe()
returns table (
  id uuid, eleve_id uuid, prenom text, nom text,
  expire_le timestamptz, fermee boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.eleve_id, p.prenom, p.nom, d.expire_le,
         (d.utilise_le is not null or d.expire_le <= now())
    from demandes_mot_de_passe d
    join profils p on p.id = d.eleve_id
   where est_mon_enfant(d.eleve_id)
     and d.cree_le > now() - make_interval(mins =>
           coalesce((select (valeur #>> '{}')::int from parametres
                      where cle = 'duree_demande_mot_de_passe_minutes'), 60) * 2)
   order by d.cree_le desc;
$$;

grant execute on function demandes_de_mot_de_passe() to authenticated;
