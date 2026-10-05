-- Le cachet ne se pose pas sur un dossier qu'on n'a pas lu.
--
-- Il manquait la moitié du geste. L'administration pouvait apposer son cachet
-- sur une fiche, mais rien ne permettait de statuer sur une PIÈCE : ni route,
-- ni écran. Elles restaient « déposée » à vie, alors que la politique de la
-- migration 001 prévoyait depuis le début que l'administration statue.
--
-- La conséquence était silencieuse et exactement contraire à la promesse du
-- produit. `pieces_controlees` ne montre que ce qui est « lisible » — donc le
-- dossier public d'un répétiteur VÉRIFIÉ affichait « aucune pièce n'est encore
-- affichable ». Une famille lisait « vérifié » sans voir un seul contrôle, ce
-- qui est la pire des deux moitiés : l'affirmation sans la preuve.
--
-- Deux choses ici, et la route qui va avec vit dans le service.
--
-- 1. LE CACHET EXIGE LES PIÈCES OBLIGATOIRES, CONTRÔLÉES. Pas déposées :
--    contrôlées. Déposer une photo floue et obtenir un cachet reviendrait à
--    vendre une vérification qui n'a pas eu lieu — et c'est précisément ce
--    qu'un parent paie.
--
--    La règle est ici et pas dans le service, parce qu'un appel direct à
--    PostgREST avec un jeton d'administrateur contournerait le service. C'est
--    la dernière porte avant la table.
--
--    « Obligatoire » se lit dans `types_pieces.requise`, qui est un RÉGLAGE :
--    le casier judiciaire est facultatif au lancement, faute de quoi il n'y
--    aurait aucun répétiteur. Le jour où l'administration le rendra
--    obligatoire, cette règle le suivra sans qu'on touche à une ligne.
--
-- 2. REVENIR EN ARRIÈRE RESTE POSSIBLE. Rien n'empêche de refuser un dossier
--    déjà vérifié, ni de marquer illisible une pièce qu'on avait validée. Une
--    vérification est une décision humaine, et une décision humaine se révise.

begin;

create or replace function proteger_verification_repetiteur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Le cachet, et seulement lui. On ne vérifie rien quand le statut ne devient
  -- pas « vérifié » : un répétiteur qui corrige sa biographie n'a pas à
  -- repasser devant ses pièces.
  if new.statut = 'verifie'
     and (tg_op = 'INSERT' or old.statut is distinct from 'verifie') then
    if exists (
      select 1
        from types_pieces t
       where t.requise
         and not exists (
           select 1 from pieces_justificatives p
            where p.repetiteur_id = new.id
              and p.type_cle = t.cle
              and p.statut = 'lisible'
         )
    ) then
      raise exception
        'Ce dossier ne peut pas être vérifié : une pièce obligatoire manque, ou n''a pas encore été contrôlée'
        using errcode = '42501';
    end if;
  end if;

  -- `auth.uid()` est nul hors d'une session utilisateur : migrations, tests,
  -- et travaux côté serveur avec la clé de service. Ces contextes ne passent
  -- déjà pas par la RLS ; ce déclencheur n'a pas à être plus strict qu'elle.
  -- Un visiteur non connecté, lui, est arrêté en amont : la politique exige
  -- `id = auth.uid()`, qui est faux quand l'identifiant est nul.
  --
  -- La règle du cachet, elle, est au-dessus de cette porte : elle ne protège
  -- pas contre une personne, elle protège un mot — « vérifié » — et ce mot ne
  -- doit pas pouvoir s'écrire depuis une migration distraite non plus.
  if est_admin() or auth.uid() is null then
    return new;
  end if;

  if new.statut       is distinct from old.statut
  or new.verifie_le   is distinct from old.verifie_le
  or new.motif_refus  is distinct from old.motif_refus then
    raise exception
      'Seule l''administration peut modifier la vérification d''une fiche'
      using errcode = '42501';
  end if;

  -- Accepter le contrat en vigueur est un acte du répétiteur, mais il ne peut
  -- pas accepter d'avance une version qui n'existe pas encore : ce serait un
  -- moyen de rester visible après un changement de facturation sans l'avoir lu.
  new.version_contrat_acceptee := least(
    new.version_contrat_acceptee,
    (select version_contrat from facturation where id = 1)
  );

  return new;
end; $$;

/**
 * Statuer sur une pièce : lisible, illisible, ou refusée.
 *
 * Trois verdicts et pas deux, parce qu'ils ne disent pas la même chose à
 * celui qui a déposé. « Illisible » veut dire « recommencez la photo » —
 * c'est le cas courant, et ce n'est pas un reproche. « Refusée » veut dire
 * « ce document ne convient pas », et demande un motif : un refus sans motif
 * ne se corrige pas.
 *
 * `examinee_le` et `examinee_par` sont posés ici et nulle part ailleurs. Ce
 * sont eux qui font la trace : le jour où une décision est contestée, on doit
 * pouvoir dire qui a regardé quoi, et quand.
 *
 * `security definer` pour poser `examinee_par` sans dépendre d'une politique
 * d'écriture sur ce champ — mais la fonction vérifie elle-même qui frappe.
 */
create or replace function statuer_sur_piece(
  piece uuid,
  verdict statut_piece,
  raison text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not est_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;

  if verdict = 'deposee' then
    raise exception 'Une pièce ne redevient pas « déposée » : c''est l''état d''avant l''examen'
      using errcode = '22023';
  end if;

  if verdict = 'refusee' and coalesce(trim(raison), '') = '' then
    raise exception 'Un refus demande un motif' using errcode = '23514';
  end if;

  update pieces_justificatives
     set statut       = verdict,
         motif        = nullif(trim(coalesce(raison, '')), ''),
         examinee_le  = now(),
         examinee_par = auth.uid()
   where id = piece;

  if not found then
    raise exception 'Cette pièce n''existe pas' using errcode = '02000';
  end if;
end; $$;

revoke all on function statuer_sur_piece(uuid, statut_piece, text)
  from public, anon;
grant execute on function statuer_sur_piece(uuid, statut_piece, text)
  to authenticated;

commit;
