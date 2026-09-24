import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"

import { FormulairesCompte, type Compte } from "./formulaires"

/**
 * Le compte de l'administrateur.
 *
 * Exister pour que personne n'ait à ouvrir la base pour changer un mot de
 * passe. Manipuler Postgres à la main pour une opération courante, c'est
 * s'exposer à la fausse manœuvre qui efface autre chose — et il n'y a pas de
 * bouton « annuler » sur un `delete`.
 */
export default async function PageProfil({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.profil

  await exigerAdmin(langue)

  const compte = await api<Compte>("/v1/compte")

  // L'adresse vient de la session et non du profil : elle vit dans auth.users,
  // et c'est la seule chose qu'on lit encore en direct ici — savoir avec quel
  // courriel on est connecté ne demande aucun aller-retour de plus.
  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <EnteteAdmin
        retourVers={chemin(langue, "/admin")} etiquette={t.etiquette} titre={t.titre} />

      <div className="px-5 pb-7 sm:px-7">
        <FormulairesCompte
          langue={langue}
          d={d}
          compte={compte}
          adresse={user?.email ?? null}
        />
      </div>
    </>
  )
}
