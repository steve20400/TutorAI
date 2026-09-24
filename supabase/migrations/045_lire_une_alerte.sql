-- Lire une alerte n'est pas la classer.
--
-- Une seule action — « classer avec une raison » — obligeait à écrire un
-- paragraphe pour dire « rien à signaler ». Devant dix alertes, on ne les lit
-- plus : la friction chasse la lecture, et c'est le contraire du but.
--
-- Deux gestes donc, qui correspondent à deux moments réels : je l'ai lue, et
-- plus tard j'ai décidé.
--
--   nouveau  →  lu  →  traite
--
-- Le passage à « lu » ne demande rien : un clic, et l'on sait qui a lu et
-- quand. Le passage à « traite » demande une raison, parce qu'une décision
-- sans motif ne dit rien à qui la relira dans six mois.
alter table signalements
  add column if not exists lu_par uuid references profils(id) on delete set null,
  add column if not exists lu_le timestamptz;

alter table signalements drop constraint if exists signalements_statut_valide;
alter table signalements add constraint signalements_statut_valide
  check (statut in ('nouveau', 'lu', 'traite'));

comment on column signalements.lu_le is
  'Quand l''administration a pris connaissance de l''alerte. Distinct de '
  '`traite_le` : on lit d''abord, on décide ensuite — et sur ce produit, '
  'savoir QUAND on a su compte autant que ce qu''on a décidé.';
