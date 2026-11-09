"use client"

import { useTransition } from "react"

import { permettreEnregistrement } from "@/actions/enregistrement"
import { useLangue } from "@/langues/contexte"

/**
 * L'interrupteur par compte, côté administration.
 *
 * ── CE QU'IL EST VRAIMENT ──
 *
 * La porte du futur abonnement. L'enregistrement sera payant : le jour où le
 * paiement arrivera, c'est cette même fonction qu'il appellera. Elle est
 * posée maintenant pour qu'il n'y ait alors qu'un fil à brancher, et pas une
 * cascade de droits à réinventer au milieu d'une intégration.
 *
 * ── CE QU'IL NE FAIT PAS ──
 *
 * Il n'enregistre pas et ne cesse pas d'enregistrer : il AUTORISE. Le parent
 * garde son propre choix par-dessus, et l'interrupteur global de la
 * plateforme reste au-dessus des deux. Fermer ici retire la fonctionnalité du
 * compte ; cela ne force personne à être enregistré.
 */
export function PermisEnregistrement({
  compte,
  permis,
}: {
  compte: string
  permis: boolean
}) {
  const { d } = useLangue()
  const t = d.adminPages.familles.enregistrement
  const [enCours, demarrer] = useTransition()

  return (
    <form
      action={(donnees) => {
        demarrer(() => {
          void permettreEnregistrement(donnees)
        })
      }}
      className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4"
      style={{ borderColor: "var(--bordure)" }}
    >
      <input type="hidden" name="compte" value={compte} />
      <input type="hidden" name="valeur" value={String(!permis)} />

      <div className="min-w-[180px] flex-1">
        <div className="text-[13px] font-medium">{t.titre}</div>
        <p className="doux mt-0.5 text-[12px] leading-relaxed">
          {permis ? t.ouvert : t.ferme}
        </p>
      </div>

      <button
        type="submit"
        disabled={enCours}
        className={permis ? "bt2" : "bt1"}
        style={{ padding: "7px 14px", fontSize: 12.5 }}
      >
        {enCours ? (
          <span className="flex items-center gap-2">
            <span className="cercle-attente" aria-hidden />
            {d.commun.enCours}
          </span>
        ) : permis ? (
          t.fermer
        ) : (
          t.ouvrir
        )}
      </button>
    </form>
  )
}
