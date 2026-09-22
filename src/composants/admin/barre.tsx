"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { chemin, type Dictionnaire, type Langue } from "@/langues"
import { Avatar } from "@/composants/avatar"
import { Marque } from "@/composants/marque"

/**
 * Les rubriques, dans l'ordre d'affichage.
 *
 * `fin` distingue le tableau de bord : sans lui, /admin serait marqué actif
 * sur toutes les sous-pages, puisqu'elles commencent toutes par ce chemin.
 */
const RUBRIQUES = [
  { cle: "tableauDeBord", route: "/admin", fin: true },
  { cle: "dossiers", route: "/admin/dossiers" },
  { cle: "repetiteurs", route: "/admin/repetiteurs" },
  { cle: "familles", route: "/admin/familles" },
  { cle: "seances", route: "/admin/seances" },
  { cle: "facturation", route: "/admin/facturation" },
  { cle: "modules", route: "/admin/modules" },
  { cle: "cles", route: "/admin/cles" },
  { cle: "registre", route: "/admin/registre" },
] as const

type CleRubrique = (typeof RUBRIQUES)[number]["cle"]

const CLE_REPLI = "tutela-admin-repliee"

function Icone({ cle }: { cle: CleRubrique }) {
  const c = {
    width: 17,
    height: 17,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "shrink-0",
  }

  switch (cle) {
    case "tableauDeBord":
      return (
        <svg {...c}>
          <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
          <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
        </svg>
      )
    case "dossiers":
      return (
        <svg {...c}>
          <path d="M2.5 5.5a2 2 0 0 1 2-2h3.3l1.8 2.2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
        </svg>
      )
    case "repetiteurs":
      return (
        <svg {...c}>
          <circle cx="10" cy="6.6" r="3.3" />
          <path d="M3.8 17c0-3.4 2.8-5.4 6.2-5.4s6.2 2 6.2 5.4" />
        </svg>
      )
    case "familles":
      return (
        <svg {...c}>
          <circle cx="7.2" cy="7" r="2.8" />
          <circle cx="14.2" cy="8.4" r="2.2" />
          <path d="M2.2 16.6c0-2.9 2.2-4.6 5-4.6s5 1.7 5 4.6" />
          <path d="M12.6 16.6c0-2.3 1.3-3.8 3.2-3.8 1.4 0 2.4.8 2.9 2" />
        </svg>
      )
    case "seances":
      return (
        <svg {...c}>
          <rect x="2.2" y="3.6" width="15.6" height="10.6" rx="2" />
          <path d="M7.6 17.4h4.8M10 14.2v3.2" />
        </svg>
      )
    case "facturation":
      return (
        <svg {...c}>
          <rect x="2.4" y="4.4" width="15.2" height="11.2" rx="2" />
          <path d="M2.4 8.4h15.2M5.6 12.4h3.2" />
        </svg>
      )
    case "modules":
      return (
        <svg {...c}>
          <path d="M3 6h5M12 6h5M3 14h9M16 14h1" />
          <circle cx="10" cy="6" r="2.1" />
          <circle cx="14" cy="14" r="2.1" />
        </svg>
      )
    case "cles":
      return (
        <svg {...c}>
          <circle cx="6.6" cy="7.2" r="3.4" />
          <path d="M9 9.6 17 17.6M14.2 14.8l1.6-1.6M11.8 12.4l1.6-1.6" />
        </svg>
      )
    case "registre":
      return (
        <svg {...c}>
          <path d="M3.4 4.2a1.8 1.8 0 0 1 1.8-1.8H16a.8.8 0 0 1 .8.8v13.6a.8.8 0 0 1-.8.8H5.2a1.8 1.8 0 0 1-1.8-1.8z" />
          <path d="M3.4 14.2h13.4M6.8 6.4h6.4M6.8 9.4h4.4" />
        </svg>
      )
  }
}

/**
 * Barre latérale de l'administration.
 *
 * Elle reste à l'encre dans les deux thèmes, motif compris : c'est elle qui
 * donne au thème clair le point d'appui qui lui manquait. Seul le plan de
 * travail change de couleur.
 *
 * Le logo est épinglé au-dessus d'une zone qui défile seule — sinon il
 * disparaîtrait dès qu'on descend dans les rubriques. Le bouton de repli vit
 * en bas, à droite de l'identité, et ne change donc pas de place selon l'état.
 */
export function BarreAdmin({
  langue,
  d,
  identifiant,
  nom,
  photoUrl,
  aVerifier,
}: {
  langue: Langue
  d: Dictionnaire
  identifiant: string | null
  nom: string | null
  photoUrl: string | null
  /** Dossiers en attente. Zéro n'affiche aucune pastille. */
  aVerifier: number
}) {
  const [repliee, poserRepliee] = useState(false)
  const cheminActuel = usePathname()

  useEffect(() => {
    try {
      poserRepliee(localStorage.getItem(CLE_REPLI) === "1")
    } catch {
      // Navigation privée : la barre reste dépliée. Sans gravité.
    }
  }, [])

  function basculer() {
    const suivant = !repliee
    poserRepliee(suivant)
    try {
      localStorage.setItem(CLE_REPLI, suivant ? "1" : "0")
    } catch {
      // idem
    }
  }

  const bordure = { borderColor: "rgb(255 255 255 / 0.12)" }

  return (
    <nav
      className={`admin-encre relative flex shrink-0 flex-col overflow-hidden ${
        repliee ? "admin-repliee w-[58px]" : "w-[188px]"
      }`}
      aria-label={d.admin.titre}
    >
      <div className="motif-fond" />

      <div
        className={`admin-encre relative z-10 flex shrink-0 items-center gap-2.5 border-b pb-3.5 pt-4 ${
          repliee ? "justify-center px-0" : "px-4"
        }`}
        style={bordure}
      >
        <Marque taille={19} />
        {repliee ? null : (
          <span className="text-[13px] font-bold tracking-[0.13em]">TUTELA</span>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto py-2.5">
        {RUBRIQUES.map((r) => {
          const cible = chemin(langue, r.route)
          const actif =
            "fin" in r && r.fin
              ? cheminActuel === cible
              : cheminActuel.startsWith(cible)

          return (
            <Link
              key={r.cle}
              href={cible}
              className="admin-lien"
              aria-current={actif ? "page" : undefined}
              title={repliee ? d.adminNav[r.cle] : undefined}
            >
              <Icone cle={r.cle} />
              <span className="admin-libelle">{d.adminNav[r.cle]}</span>
              {r.cle === "dossiers" && aVerifier > 0 ? (
                <span className="admin-compteur">{aVerifier}</span>
              ) : null}
            </Link>
          )
        })}
        <div className="admin-voile" />
      </div>

      <div
        className={`admin-encre relative z-10 flex shrink-0 border-t py-2.5 ${
          repliee
            ? "flex-col items-center gap-2 px-0"
            : "items-center gap-2.5 pl-4 pr-3"
        }`}
        style={bordure}
      >
        <Avatar nom={nom ?? identifiant} photoUrl={photoUrl} taille={26} />
        {repliee ? null : (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[11.5px] font-medium">
              {identifiant}
            </span>
            <span
              className="block truncate text-[10px]"
              style={{ color: "#93a0bb" }}
            >
              {d.adminNav.administrateur}
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={basculer}
          aria-label={repliee ? d.adminNav.ouvrir : d.adminNav.replier}
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] transition hover:bg-white/10"
          style={{ border: "1px solid rgb(255 255 255 / 0.22)", color: "#c3cde0" }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <rect x="1.2" y="2.2" width="13.6" height="11.6" rx="2" />
            <path d="M6 2.2v11.6" />
            <path
              d={repliee ? "M9.4 6.2 11.4 8l-2 1.8" : "M11.4 6.2 9.4 8l2 1.8"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </nav>
  )
}
