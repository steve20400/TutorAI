-- Un enfant ne met pas sa photo. Il choisit un avatar, ou garde ses initiales.
--
-- C'est une décision de protection, pas d'ergonomie. Une photo d'enfant sur
-- une plateforme où des adultes cherchent des élèves est une information dont
-- personne n'a besoin : ni le répétiteur, qui verra l'enfant en séance, ni le
-- parent, qui sait à quoi ressemble le sien. Elle ne sert qu'à celui qui
-- regarde sans raison.
--
-- La règle est en base et pas seulement dans l'écran : un formulaire qui
-- n'offre pas le champ ne protège rien — l'action derrière accepte quand même
-- ce qu'on lui envoie. C'est la leçon de `repetiteurs.statut` et de
-- `profils.role`, deux fois la même erreur.
--
-- `avatar:xx` et non une URL : un élève ne peut donc désigner aucun fichier,
-- ni sur la plateforme ni ailleurs. Le dessin est choisi dans une liste
-- fermée que l'application connaît, et rien d'extérieur n'entre.
create or replace function proteger_photo_eleve()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.photo_url is null or new.photo_url = old.photo_url then
    return new;
  end if;

  if new.role = 'eleve' and new.photo_url !~ '^avatar:[0-9]{2}$' then
    raise exception 'Un élève choisit un avatar, pas une photo'
      using errcode = '42501';
  end if;

  return new;
end; $$;

drop trigger if exists sur_photo_profil on profils;
create trigger sur_photo_profil
  before update on profils
  for each row execute function proteger_photo_eleve();
