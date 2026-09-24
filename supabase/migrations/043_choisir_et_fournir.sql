-- Deux gestes, deux fonctions.
--
-- Ouvrir `liens_familiaux` en modification aurait demandé des droits par
-- colonne — `porte` pour l'enfant, `fournit` pour l'adulte — et les droits par
-- colonne valent pour un rôle entier, pas pour une politique. L'enfant aurait
-- donc pu décider qui fournit, et l'adulte qui porte.
--
-- Deux fonctions qui ne savent faire qu'une chose chacune, et qui vérifient
-- de quel droit elles agissent.

-- ── L'enfant choisit qui porte ses séances ──────────────────────────────────
create or replace function choisir_porteur(parent uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  if not exists (
    select 1 from liens_familiaux
     where eleve_id = moi and parent_id = parent
  ) then
    raise exception 'Cet adulte n''est pas rattaché à toi' using errcode = '42501';
  end if;

  -- Un seul porteur à la fois.
  update liens_familiaux set porte = false where eleve_id = moi;
  update liens_familiaux set porte = true
   where eleve_id = moi and parent_id = parent;
end; $$;

-- ── L'adulte décide s'il fournit ────────────────────────────────────────────
-- Parents séparés, oncle rattaché par courtoisie : sans cet interrupteur, on
-- importerait des conflits de famille dans l'application.
create or replace function fournir_les_jetons(eleve uuid, oui boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  touchee int;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  update liens_familiaux set fournit = oui
   where parent_id = moi and eleve_id = fournir_les_jetons.eleve;

  get diagnostics touchee = row_count;

  -- Une écriture qui ne touche aucune ligne ne doit pas répondre « ok ».
  if touchee = 0 then
    raise exception 'Cet enfant ne vous est pas rattaché' using errcode = '42501';
  end if;
end; $$;

grant execute on function choisir_porteur(uuid) to authenticated;
grant execute on function fournir_les_jetons(uuid, boolean) to authenticated;
