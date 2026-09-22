import { EnteteAdmin } from "@/composants/admin/entete"
import { FormulaireFacturation } from "@/composants/admin/facturation"
import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { lireParametres } from "@/lib/parametres"

export default async function PageFacturation({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.facturation

  const { supabase } = await exigerAdmin(langue)
  const parametres = await lireParametres()

  const { data: facturation } = await supabase
    .from("facturation")
    .select("mode, montant_par_eleve, delai_masquage_jours")
    .eq("id", 1)
    .single()

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={t.titre} />

      <div className="max-w-2xl px-5 sm:px-7 pb-7">
        <FormulaireFacturation
          langue={langue}
          d={d}
          portefeuilleActif={parametres.portefeuille_actif}
          initiales={{
            mode: facturation?.mode ?? "par_eleve_actif",
            montant: facturation?.montant_par_eleve ?? 0,
            delai: facturation?.delai_masquage_jours ?? 15,
          }}
        />
      </div>
    </>
  )
}
