-- Le répétiteur dépose ses pièces, et peut enfin suivre ce qu'elles deviennent.
--
-- Le seau existe depuis la migration 020, la table depuis la 001, et une
-- politique autorise déjà un répétiteur à INSÉRER sa ligne. Mais rien au-dessus
-- ne s'en servait : aucune route ne permettait de déposer une pièce. Un
-- répétiteur pouvait donc s'inscrire, remplir sa fiche, et jamais être
-- vérifié — ce qui laissait l'annuaire figé sur les dossiers créés à la main.
--
-- Deux manques en plus de la route :
--
-- 1. Il ne peut pas RELIRE ses propres lignes : `pieces_justificatives` ne
--    s'ouvre qu'à l'administration. Il déposait donc dans le noir, sans savoir
--    ce qui manquait, ni ce qui avait été jugé illisible, ni pourquoi.
--
-- 2. Il ne peut pas REMPLACER une pièce : `unique (repetiteur_id, type_cle)`
--    refuse la seconde. Or la mauvaise photo est le cas courant — le seau le
--    dit lui-même : « elle se remplace, elle ne se relit pas ».
--
-- `mes_pieces()` rend le statut et le motif, ce que l'annuaire ne montre
-- jamais : « illisible, reprenez la photo » est exactement ce dont celui qui a
-- déposé a besoin, et exactement ce qu'un parent n'a pas à savoir.
--
-- Le chemin du fichier ne sort pas, même pour celui qui l'a envoyé. La
-- migration 020 l'a tranché : une pièce déposée par erreur ne doit pas rester
-- consultable par celui qui l'a envoyée.

begin;

create or replace function mes_pieces()
returns table (
  cle text,
  libelle_fr text,
  libelle_en text,
  requise boolean,
  statut statut_piece,
  motif text,
  deposee_le timestamptz,
  examinee_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  -- Tous les types, pas seulement les déposés : c'est la liste de ce qu'on
  -- attend de lui, et une case vide dit plus qu'une absence de ligne.
  select t.cle, t.libelle_fr, t.libelle_en, t.requise,
         j.statut, j.motif, j.deposee_le, j.examinee_le
    from types_pieces t
    left join pieces_justificatives j
      on j.type_cle = t.cle and j.repetiteur_id = auth.uid()
   where auth.uid() is not null
   order by t.ordre;
$$;

create or replace function deposer_piece(type_piece text, chemin_fichier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  etat statut_verification;
begin
  if moi is null then
    raise exception 'Connectez-vous' using errcode = '42501';
  end if;

  select statut into etat from repetiteurs where id = moi;

  if etat is null then
    raise exception 'Remplissez votre fiche avant de déposer une pièce'
      using errcode = '42501';
  end if;

  -- Un dossier déjà validé ne se modifie pas en silence.
  --
  -- Laisser remplacer une pièce après la vérification permettrait d'être
  -- contrôlé avec un document, puis d'en substituer un autre que personne
  -- n'aurait regardé — tout en restant affiché comme vérifié dans l'annuaire.
  -- Renvoyer le dossier en attente serait l'autre solution, mais le
  -- déclencheur de la migration 003 interdit au répétiteur de toucher son
  -- propre statut, et il a raison : on ne contourne pas cette règle depuis
  -- une fonction qu'il déclenche lui-même.
  if etat = 'verifie' then
    raise exception 'Votre dossier est déjà validé : écrivez à l''administration pour changer une pièce'
      using errcode = '42501';
  end if;

  if not exists (select 1 from types_pieces where cle = type_piece) then
    raise exception 'Type de pièce inconnu' using errcode = '22023';
  end if;

  insert into pieces_justificatives (repetiteur_id, type_cle, chemin)
  values (moi, type_piece, chemin_fichier)
  on conflict (repetiteur_id, type_cle) do update
     set chemin      = excluded.chemin,
         statut      = 'deposee',
         -- Le verdict d'hier ne vaut pas pour le fichier d'aujourd'hui.
         motif       = null,
         examinee_le = null,
         examinee_par = null,
         deposee_le  = now();
end; $$;

revoke all on function mes_pieces() from public, anon;
revoke all on function deposer_piece(text, text) from public, anon;
grant execute on function mes_pieces() to authenticated;
grant execute on function deposer_piece(text, text) to authenticated;

commit;
