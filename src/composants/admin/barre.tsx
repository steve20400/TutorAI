"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { seDeconnecter } from "@/actions/authentification"
import { chemin, type Dictionnaire, type Langue } from "@/langues"
import { Avatar } from "@/composants/avatar"
import { Marque } from "@/composants/marque"
import { BasculeMode } from "@/composants/theme"

/**
 * Les rubriques, dans l'ordre d'affichage.
 *
 * `fin` distingue le tableau de bord : sans lui, /admin serait marqué actif
 * sur toutes les sous-pages, puisqu'elles commencent toutes par ce chemin.
 */
const RUBRIQUES = [
  { cle: "tableauDeBord", route: "/admin", fin: true },
  { cle: "dossiers", route: "/admin/dossiers" },
  { cle: "signalements", route: "/admin/signalements" },
  { cle: "repetiteurs", route: "/admin/repetiteurs" },
  { cle: "familles", route: "/admin/familles" },
  { cle: "seances", route: "/admin/seances" },
  { cle: "programmes", route: "/admin/programmes" },
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
    case "signalements":
      // Une cloche. Ni œil, ni triangle, ni compas — et rien qui ressemble à
      // un point d'exclamation dans un triangle, qui est précisément la forme
      // dont on ne veut pas.
      return (
        <svg {...c}>
          <path d="M5.4 8.4a4.6 4.6 0 0 1 9.2 0c0 3.4.9 4.8 1.6 5.6H3.8c.7-.8 1.6-2.2 1.6-5.6z" />
          <path d="M8.3 16.5a1.9 1.9 0 0 0 3.4 0" />
        </svg>
      )
    case "repetiteurs":
      return (
        <svg {...c}>
          <circle cx="10" cy="6.6" r="3.3" />
          <path d="M3.8 17c0-3.4 2.8-5.4 6.2-5.4s6.2 2 6.2 5.4" />
        </svg>
      )
    case "programmes":
      // Un cahier ouvert : ce que l'élève a devant lui, et ce que le tuteur
      // doit connaître. Ni œil, ni triangle, ni compas.
      return (
        <svg {...c}>
          <path d="M10 5.4C8.6 4.2 6.8 3.6 4.6 3.6H2.8v11h1.8c2.2 0 4 .6 5.4 1.8" />
          <path d="M10 5.4c1.4-1.2 3.2-1.8 5.4-1.8h1.8v11h-1.8c-2.2 0-4 .6-5.4 1.8" />
          <path d="M10 5.4v11" />
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

function BoutonRepli({
  repliee,
  ouverte,
  basculer,
  d,
}: {
  repliee: boolean
  /** Barre posée par-dessus la page, sur téléphone. */
  ouverte: boolean
  basculer: () => void
  d: Dictionnaire
}) {
  // « Fermer » sur téléphone, « déplier »/« replier » sur grand écran : un
  // intitulé qui décrit un autre geste que celui du clic trompe qui ne voit
  // pas l'écran.
  const etiquette = ouverte
    ? d.adminNav.replier
    : repliee
      ? d.adminNav.ouvrir
      : d.adminNav.replier

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={etiquette}
      title={etiquette}
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
          d={
            ouverte || !repliee
              ? "M11.4 6.2 9.4 8l2 1.8"
              : "M9.4 6.2 11.4 8l-2 1.8"
          }
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
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
  // Téléphone uniquement. Sur grand écran la barre est toujours là ; c'est
  // `repliee` qui décide si elle montre ses libellés ou seulement ses icônes.
  const [ouverte, poserOuverte] = useState(false)
  const cheminActuel = usePathname()

  useEffect(() => {
    try {
      poserRepliee(localStorage.getItem(CLE_REPLI) === "1")
    } catch {
      // Navigation privée : la barre reste dépliée. Sans gravité.
    }
  }, [])

  // Changer de page referme la barre : sur téléphone elle couvre l'écran, et
  // la laisser ouverte cacherait la page qu'on vient de demander.
  useEffect(() => {
    poserOuverte(false)
  }, [cheminActuel])

  // Échap referme, comme tout ce qui se pose par-dessus une page.
  useEffect(() => {
    if (!ouverte) return
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") poserOuverte(false)
    }
    window.addEventListener("keydown", surTouche)
    return () => window.removeEventListener("keydown", surTouche)
  }, [ouverte])

  /**
   * Glisser pour ouvrir et fermer.
   *
   * L'ouverture ne part que du bord gauche — sinon le geste volerait tous les
   * défilements horizontaux de la page, à commencer par le tableau des
   * répétiteurs. La fermeture, elle, part de n'importe où : la barre couvre
   * déjà l'écran, il n'y a rien d'autre à faire glisser.
   */
  useEffect(() => {
    let x0 = 0
    let y0 = 0
    let candidat = false

    const debut = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      x0 = t.clientX
      y0 = t.clientY
      candidat = ouverte || x0 <= 28
    }

    const fin = (e: TouchEvent) => {
      if (!candidat) return
      candidat = false
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - x0
      const dy = t.clientY - y0
      // Un geste franc et horizontal : sinon c'est un défilement vertical.
      if (Math.abs(dx) < 55 || Math.abs(dy) > Math.abs(dx)) return
      if (dx > 0 && !ouverte) poserOuverte(true)
      if (dx < 0 && ouverte) poserOuverte(false)
    }

    window.addEventListener("touchstart", debut, { passive: true })
    window.addEventListener("touchend", fin, { passive: true })
    return () => {
      window.removeEventListener("touchstart", debut)
      window.removeEventListener("touchend", fin)
    }
  }, [ouverte])

  /**
   * Un seul bouton, deux gestes selon la taille de l'écran.
   *
   * Sur téléphone la barre est posée par-dessus la page : le bouton la ferme.
   * Sur grand écran elle reste en place : il la réduit à ses icônes.
   *
   * `ouverte` n'est vrai que sur téléphone — seul le bouton du haut, masqué à
   * partir de `lg`, le met à vrai. Il sert donc aussi d'indicateur de
   * contexte, sans avoir à mesurer la fenêtre.
   *
   * Sans cette distinction, le bouton basculait `repliee` sur téléphone, où
   * cette classe n'a aucun effet : il paraissait mort, et il fallait deviner
   * qu'on ferme en touchant le voile ou en glissant vers la gauche.
   */
  function basculer() {
    if (ouverte) {
      poserOuverte(false)
      return
    }

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
    <>
      {/* Téléphone : la barre n'occupe plus aucune largeur, elle revient par
          ce bouton. Garder une bande d'icônes ici amputerait un écran déjà
          étroit, et les pages larges — le tableau des répétiteurs — n'ont pas
          de place à donner. */}
      <header
        className="admin-encre relative z-30 flex shrink-0 items-center gap-2.5 px-3 py-2.5 lg:hidden"
        style={{ borderBottom: "1px solid rgb(255 255 255 / 0.12)" }}
      >
        <div className="motif-fond" />
        <button
          type="button"
          onClick={() => poserOuverte(true)}
          aria-label={d.adminNav.ouvrir}
          aria-expanded={ouverte}
          className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] transition hover:bg-white/10"
          style={{ color: "#c3cde0" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          </svg>
        </button>
        <span className="relative z-10 flex items-center gap-2">
          <Marque taille={17} />
          <span className="text-[12px] font-bold tracking-[0.13em]">TUTELA</span>
        </span>
        <span className="relative z-10 ml-auto">
          <BasculeMode couleur="#c3cde0" taille={32} />
        </span>
      </header>

      {/* Le voile. Il ne ferme pas seulement au clic : il dit aussi que la
          page est encore là, dessous. */}
      {ouverte ? (
        <button
          type="button"
          aria-label={d.adminNav.replier}
          onClick={() => poserOuverte(false)}
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgb(10 16 28 / 0.55)" }}
        />
      ) : null}

      <nav
        className={`admin-encre fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col overflow-hidden transition-transform duration-200 lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 lg:transition-none ${
          ouverte ? "translate-x-0" : "-translate-x-full"
        } ${repliee ? "admin-repliee lg:w-[58px]" : "lg:w-[188px]"}`}
        aria-label={d.admin.titre}
        aria-hidden={undefined}
      >
      <div className="motif-fond" />

      <div
        className="admin-tete admin-encre relative z-10 flex shrink-0 items-center gap-2.5 border-b pb-3.5 pl-4 pr-2.5 pt-4"
        style={bordure}
      >
        <Marque taille={19} />
        <span className="admin-libelle text-[13px] font-bold tracking-[0.13em]">
          TUTELA
        </span>
        <span className="admin-libelle flex-1" />
        <BoutonRepli
          repliee={repliee}
          ouverte={ouverte}
          basculer={basculer}
          d={d}
        />
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
        className="admin-pied admin-encre relative z-10 flex shrink-0 flex-col gap-2 border-t px-3 py-2.5"
        style={bordure}
      >
        {/* Le thème et la sortie. Sans eux, un administrateur entré en
            affichage clair n'avait aucun moyen d'en changer ni de se
            déconnecter : il fallait vider les cookies. */}
        <div className="admin-rangee flex items-center gap-2">
          <span
            className="admin-libelle text-[11.5px]"
            style={{ color: "#c3cde0" }}
          >
            {d.adminNav.theme}
          </span>
          <span className="admin-libelle flex-1" />
          <BasculeMode couleur="#c3cde0" taille={30} />
        </div>

        <div className="admin-rangee flex items-center gap-2.5">
          {/* L'identité mène au compte. C'est là qu'on la cherche — et sans
              ce lien, changer son mot de passe demandait d'ouvrir la base,
              ce qu'on ne fait pas pour une opération courante. */}
          <Link
            href={chemin(langue, "/admin/profil")}
            title={d.adminPages.profil.etiquette}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] transition hover:bg-white/10"
          >
            <Avatar nom={nom ?? identifiant} photoUrl={photoUrl} taille={26} />
            <span className="admin-libelle min-w-0 flex-1 leading-tight">
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
          </Link>
          <form action={seDeconnecter} className="shrink-0">
            <input type="hidden" name="langue" value={langue} />
            <button
              type="submit"
              title={d.commun.seDeconnecter}
              aria-label={d.commun.seDeconnecter}
              className="grid h-[30px] w-[30px] place-items-center rounded-[8px] transition hover:bg-white/10"
              style={{ color: "#c3cde0" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12.5 14.2v1.6a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V4.2a1.8 1.8 0 0 1 1.8-1.8h6.1a1.8 1.8 0 0 1 1.8 1.8v1.6" />
                <path d="M8.4 10h9M14.6 7l3 3-3 3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
      </nav>
    </>
  )
}
