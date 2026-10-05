"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

import { LANGUES, dictionnaire, cheminSansLangue } from "@/langues"
import { useLangue } from "@/langues/contexte"

/**
 * Bascule français / anglais.
 *
 * Elle reste sur la même page : on remplace le segment de langue dans
 * l'adresse au lieu de renvoyer à l'accueil. Un parent qui découvre en cours
 * d'inscription que l'application existe dans sa langue ne doit pas perdre ce
 * qu'il a déjà saisi — d'où `router.replace`, qui n'empile pas d'entrée dans
 * l'historique.
 *
 * ---
 *
 * DEUX DÉFAUTS, ET LE PREMIER EST DE MON FAIT.
 *
 * Changer de langue traverse `[langue]`, donc tout l'arbre est refait côté
 * serveur. Tant que rien n'annonçait l'attente, cela passait inaperçu. Le
 * jour où j'ai posé un squelette de chargement, il s'est mis à clignoter ici
 * aussi : l'écran se vidait, se redessinait en gris, puis revenait. Steve l'a
 * dit tel quel — « ça actualise toute la page ».
 *
 * `startTransition` règle exactement ça. Pendant une transition, Next garde
 * l'écran actuel affiché et n'ouvre aucun `loading.tsx` : rien ne disparaît,
 * les deux lettres montrent qu'elles travaillent, et le texte change quand il
 * est prêt. On ne gagne pas une milliseconde ; on cesse de détruire l'écran
 * pour le reconstruire sous les yeux de celui qui le lisait.
 *
 * Le second défaut est plus vieux et plus grave : `usePathname` ne rend pas
 * la requête. Passer à l'anglais depuis `/fr/annuaire?ville=Douala&q=maths`
 * envoyait sur `/en/annuaire` — ville, recherche et prix effacés, sans un
 * mot. On lit donc la requête réelle du navigateur, à l'instant du clic.
 */
export function BasculeLangue() {
  const { langue, d } = useLangue()
  const chemin = usePathname()
  const router = useRouter()
  const [enCours, demarrer] = useTransition()

  function basculer(cible: string) {
    // Lue ici et non par `useSearchParams` : nous sommes dans un gestionnaire
    // de clic, donc dans le navigateur, et ce détour évite d'imposer une
    // frontière de suspense à chaque écran qui porte la coque.
    const requete =
      typeof window === "undefined" ? "" : window.location.search

    demarrer(() => {
      router.replace(`/${cible}${cheminSansLangue(chemin)}${requete}`)
    })
  }

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={d.commun.changerLangue}
      aria-busy={enCours}
    >
      {LANGUES.map((cible) => {
        const actif = cible === langue
        return (
          <button
            key={cible}
            type="button"
            lang={dictionnaire(cible).meta.htmlLang}
            aria-current={actif ? "true" : undefined}
            disabled={enCours}
            onClick={() => (actif ? undefined : basculer(cible))}
            className="rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em] transition"
            style={{
              color: actif ? "var(--texte)" : "var(--texte-doux)",
              background: actif
                ? "color-mix(in srgb, var(--texte) 9%, transparent)"
                : "transparent",
              // Pendant la bascule, celle qu'on vient de choisir s'allume.
              // Sans ce signe, un réseau lent rend le bouton muet et on
              // reclique — sur l'autre langue, cette fois.
              opacity: enCours && !actif ? 0.55 : 1,
            }}
          >
            {dictionnaire(cible).meta.nomCourt}
          </button>
        )
      })}
    </div>
  )
}
