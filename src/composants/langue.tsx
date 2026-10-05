"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useTransition } from "react"

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
 * `startTransition` seul n'y suffit pas, et je l'ai mesuré avant de le dire :
 * une transition n'épargne que les frontières d'attente DÉJÀ montées. Changer
 * de langue change `[langue]`, donc tout le sous-arbre est neuf, frontière
 * comprise — le squelette s'ouvrait quand même.
 *
 * Ce qui l'évite, c'est de n'avoir rien à attendre. L'autre langue est
 * récupérée d'avance, dès que ces deux lettres apparaissent à l'écran : dans
 * un menu, c'est au moment où on l'ouvre, donc avant le clic et sans frais
 * pour qui ne s'en sert jamais. Au clic, la page est déjà là, rien ne
 * suspend, et l'écran change de langue sans jamais se vider.
 *
 * La transition reste : elle rend le travail visible si le réseau a été plus
 * lent que la main.
 *
 * Le second défaut est plus vieux et plus grave : `usePathname` ne rend pas
 * la requête. Passer à l'anglais depuis `/fr/annuaire?ville=Douala&q=maths`
 * envoyait sur `/en/annuaire` — ville, recherche et prix effacés, sans un
 * mot. On lit donc la requête réelle du navigateur, à l'instant du clic.
 */
export function BasculeLangue({
  avant,
}: {
  /**
   * Appelé juste avant de partir. Le menu du compte s'en sert pour laisser
   * un mot à celui qui va renaître : changer de langue remonte tout l'arbre,
   * et il se refermait sous le doigt alors que la bascule du thème, elle, le
   * laisse ouvert.
   */
  avant?: () => void
} = {}) {
  const { langue, d } = useLangue()
  const chemin = usePathname()
  const router = useRouter()
  const [enCours, demarrer] = useTransition()

  // L'adresse de l'autre langue, requête comprise.
  const versLangue = (cible: string) =>
    `/${cible}${cheminSansLangue(chemin)}${
      typeof window === "undefined" ? "" : window.location.search
    }`

  useEffect(() => {
    for (const cible of LANGUES) {
      if (cible !== langue) router.prefetch(versLangue(cible))
    }
    // `versLangue` se referme sur `chemin` : la liste ci-dessous suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langue, chemin, router])

  function basculer(cible: string) {
    avant?.()
    demarrer(() => {
      router.replace(versLangue(cible))
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
