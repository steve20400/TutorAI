-- Saisir le programme officiel depuis l'espace d'administration.
--
-- Le code sait déjà envoyer au tuteur les prérequis, les habiletés et les
-- savoir-faire d'une leçon. Mais la donnée ne les contient pas : sur les
-- douze leçons du programme ivoirien de Terminale D, UNE SEULE porte ses
-- compétences. Les onze autres n'ont qu'un titre.
--
-- L'« ancrage au programme officiel » — ce qui distingue ce tuteur d'un robot
-- bavard — se résume donc aujourd'hui à une liste de douze titres. Ce n'est
-- pas un défaut de programmation : c'est de la saisie, et personne ne peut la
-- faire à la place de celui qui a le document officiel sous les yeux.
--
-- Donc : le moyen de saisir, et de voir ce qui manque.

-- ── L'administration peut écrire ────────────────────────────────────────────
drop policy if exists "l'administration tient les programmes" on programmes;
create policy "l'administration tient les programmes" on programmes
  for update to authenticated
  using (est_admin()) with check (est_admin());

-- ── Modifier une seule leçon ────────────────────────────────────────────────
-- Et non remplacer le contenu entier depuis le navigateur : une erreur de
-- saisie effacerait alors tout le programme, et il n'y aurait aucun moyen de
-- s'en apercevoir avant qu'un élève ne s'en plaigne.
create or replace function modifier_lecon(
  programme uuid,
  lecon_id text,
  detail jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nouveau jsonb;
  touchee int;
begin
  if not est_admin() then
    raise exception 'Seule l''administration saisit le programme'
      using errcode = '42501';
  end if;

  -- On reconstruit l'arbre en ne changeant que la leçon visée. `||` fusionne :
  -- les clés fournies écrasent les anciennes, celles qu'on ne fournit pas
  -- restent — on ne perd pas le titre en enregistrant des prérequis.
  select jsonb_set(
           p.contenu,
           '{competences}',
           (select jsonb_agg(
              c || jsonb_build_object('themes', (
                select jsonb_agg(
                  t || jsonb_build_object('lecons', (
                    select jsonb_agg(
                      case when l->>'id' = lecon_id then l || detail else l end
                      order by ordinalite
                    )
                    from jsonb_array_elements(t->'lecons')
                         with ordinality as x(l, ordinalite)
                  ))
                  order by ordinalite
                )
                from jsonb_array_elements(c->'themes')
                     with ordinality as y(t, ordinalite)
              ))
              order by ordinalite
            )
            from jsonb_array_elements(p.contenu->'competences')
                 with ordinality as z(c, ordinalite))
         )
    into nouveau
    from programmes p
   where p.id = programme;

  if nouveau is null then
    raise exception 'Programme introuvable';
  end if;

  update programmes set contenu = nouveau where id = programme;

  -- Une écriture qui ne trouve pas sa leçon ne doit pas répondre « ok ».
  select count(*) into touchee
    from jsonb_array_elements(nouveau->'competences') c,
         jsonb_array_elements(c->'themes') t,
         jsonb_array_elements(t->'lecons') l
   where l->>'id' = lecon_id;

  if touchee = 0 then
    raise exception 'Leçon % introuvable dans ce programme', lecon_id;
  end if;
end; $$;

-- ── Ce qui manque, en un coup d'œil ─────────────────────────────────────────
-- Une leçon est « renseignée » dès qu'elle porte autre chose que son titre et
-- son identifiant. C'est volontairement peu exigeant : le but est de voir le
-- chantier avancer, pas de décréter ce qu'est une leçon complète.
create or replace function avancement_des_programmes()
returns table (
  id uuid, pays text, niveau text, matiere text, publie boolean,
  lecons integer, renseignees integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.pays, p.niveau, p.matiere, p.publie,
         count(l.*)::int,
         count(*) filter (
           where (select count(*) from jsonb_object_keys(l.l) k
                   where k not in ('id', 'titre')) > 0
         )::int
  from programmes p
  left join lateral (
    select l
    from jsonb_array_elements(p.contenu->'competences') c,
         jsonb_array_elements(c->'themes') t,
         jsonb_array_elements(t->'lecons') l
  ) l on true
  where p.publie or est_admin()
  group by p.id, p.pays, p.niveau, p.matiere, p.publie
  order by p.pays, p.niveau, p.matiere;
$$;

grant execute on function modifier_lecon(uuid, text, jsonb) to authenticated;
grant execute on function avancement_des_programmes() to authenticated;
