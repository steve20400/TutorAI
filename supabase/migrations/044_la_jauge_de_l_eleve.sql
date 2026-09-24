-- De quoi dessiner la jauge.
--
-- `jauge_de_l_eleve` rend un mot — large, bientôt, épuisé — ce qui suffit à
-- décider, mais pas à dessiner un anneau qui se vide. Il faut une proportion,
-- donc une référence : le plafond au moment où les jetons ont été attribués.
--
-- Une proportion n'est pas un nombre de jetons. L'élève voit qu'il en reste
-- un tiers ; il ne voit pas « 18 400 », qui ne veut rien dire pour lui et en
-- ferait un comptable.
alter table credits add column if not exists plafond bigint not null default 0;

comment on column credits.plafond is
  'La réserve au moment de l''attribution. Sert uniquement à dessiner la '
  'jauge : sans référence, « il reste 18 400 » ne se rapporte à rien.';

-- Les réserves existantes prennent leur solde pour plafond, faute de mieux.
update credits set plafond = greatest(plafond, jetons) where plafond = 0;

create or replace function jauge_detaillee(eleve uuid)
returns table (actif boolean, etat text, part integer, payeur uuid)
language sql
stable
security definer
set search_path = public
as $$
  with reglage as (
    select coalesce((select (valeur #>> '{}')::boolean from parametres
                      where cle = 'jetons_actifs'), false) as allume
  ),
  qui as (select payeur_pour(eleve) as compte),
  reserve as (
    select c.jetons, c.plafond
      from credits c join qui on qui.compte = c.compte_id
  )
  select
    (select allume from reglage),
    jauge_de_l_eleve(eleve),
    case
      when not (select allume from reglage) then 100
      when (select plafond from reserve) is null then 0
      when (select plafond from reserve) = 0 then 0
      else greatest(0, least(100,
        round((select jetons from reserve)::numeric
              / (select plafond from reserve) * 100)::int))
    end,
    (select compte from qui);
$$;

grant execute on function jauge_detaillee(uuid) to authenticated;
