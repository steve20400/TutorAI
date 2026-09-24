-- Une classe aussi peut être écrite par l'élève.
--
-- La liste scolaire ne peut pas tout prévoir : le primaire, l'université, une
-- formation professionnelle. Et un adulte qui révise pour lui-même n'est dans
-- aucune classe — or ce compte existe désormais, puisque « je suis parent »
-- est devenu « je suis adulte ».
alter table niveaux add column if not exists propose_par_un_eleve boolean not null default false;

comment on column niveaux.propose_par_un_eleve is
  'Vrai quand la classe vient d''un élève et non du référentiel de départ. '
  'Ce qu''ils saisissent dit quel niveau scolaire la plateforme touche '
  'vraiment.';

drop policy if exists "un eleve propose un niveau" on niveaux;
create policy "un eleve propose un niveau" on niveaux
  for insert to authenticated
  with check (propose_par_un_eleve and actif);
