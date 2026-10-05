"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Avatar } from "@/composants/avatar"
import { seDeconnecter } from "@/actions/authentification"
import { BoutonAction } from "@/composants/bouton-action"
import { BasculeLangue } from "@/composants/langue"
import { BasculeMode } from "@/composants/theme"
import { useSortie } from "@/composants/sortie"
import { type Dictionnaire, type Langue } from "@/langues"

export type Entree = { href: string; titre: string; detail: string; icone: Icone }
export type Icone =
  | "profil"
  | "enfants"
  | "messages"
  | "annuaire"
  | "reglages"

/**
 * Le menu du compte : liste déroulante sur grand écran, feuille montante sur
 * téléphone.
 *
 * Les deux formes viennent du canevas — `Main.dc.html` pour la liste de
 * 224 px ancrée sous l'avatar, `MenuTel.dc.html` pour la feuille à coins
 * arrondis qui monte du bas sur fond assombri, poignée comprise.
 *
 * Un seul composant pour les deux : ce sont les mêmes entrées, et deux
 * composants auraient divergé à la première ligne ajoutée. Le point de
 * bascule est 1024 px, comme partout ailleurs dans l'application.
 */
export function MenuCompte({
  prenom,
  nom,
  photoUrl,
  sousTitre,
  entrees,
  langue,
  d,
}: {
  prenom: string | null
  nom: string | null
  photoUrl: string | null
  /** « Parent · Yaoundé », « Répétiteur · vérifié »… */
  sousTitre: string
  entrees: Entree[]
  langue: Langue
  d: Dictionnaire
}) {
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement | null>(null)
  const sortie = useSortie(langue)

  // Le glissement de la feuille, sur téléphone.
  //
  // Elle montait et ne redescendait que par le fond assombri ou par Échap —
  // or une feuille qu'on a poussée vers le haut, on la repousse vers le bas.
  // C'est le geste que la poignée promet, et il ne faisait rien.
  //
  // `tire` coupe la transition pendant le geste : la feuille doit suivre le
  // doigt sans retard. Elle la retrouve au relâcher, pour revenir ou partir.
  const [glisse, setGlisse] = useState(0)
  const [tire, setTire] = useState(false)
  const depart = useRef<number | null>(null)

  function fermer() {
    setOuvert(false)
    setTire(false)
    setGlisse(0)
    depart.current = null
  }

  /**
   * Fermer en poursuivant le geste.
   *
   * La feuille disparaissait net à la fin du glissement : le doigt la
   * descendait de cent points, puis les deux cents restants s'évanouissaient
   * d'un coup. On la laisse finir sa course sous le même mouvement, puis on
   * la retire. La durée est celle de la transition, à rien près.
   */
  function fermerEnGlissant() {
    setTire(false)
    depart.current = null
    setGlisse(1000)
    window.setTimeout(fermer, 190)
  }

  // Fermer en cliquant ailleurs et sur Échap : un menu qui ne se ferme que
  // par son propre bouton se laisse ouvert, et masque la page dessous.
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) {
        setOuvert(false)
        setGlisse(0)
      }
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false)
        setGlisse(0)
      }
    }
    document.addEventListener("mousedown", dehors)
    document.addEventListener("keydown", echap)
    return () => {
      document.removeEventListener("mousedown", dehors)
      document.removeEventListener("keydown", echap)
    }
  }, [ouvert])

  const nomComplet = [prenom, nom].filter(Boolean).join(" ")

  return (
    <div className="relative" ref={zone}>
      <button
        type="button"
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label={d.coque.monCompte}
        className="flex items-center gap-2 p-0.5 lg:gap-[9px] lg:px-0.5 lg:py-1"
      >
        <Avatar nom={prenom ?? "?"} photoUrl={photoUrl} taille={32} statique />
        <span className="hidden text-[13.5px] lg:inline">{prenom}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="hidden shrink-0 lg:block"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* ── Grand écran : la liste ancrée sous l'avatar ── */}
      {ouvert ? (
        <div
          role="menu"
          className="absolute right-0 top-[52px] z-50 hidden w-56 rounded-[12px] border p-1.5 lg:block"
          style={{
            background: "var(--surface)",
            borderColor: "var(--bordure)",
            color: "var(--texte)",
            boxShadow: "0 10px 28px rgb(10 16 28 / 0.18)",
          }}
        >
          <div className="px-3.5 pb-2 pt-2.5">
            <p className="m-0 text-[14px] font-medium">{nomComplet}</p>
            <p className="doux m-0 mt-0.5 text-[12px]">{sousTitre}</p>
          </div>
          <div
            className="mx-2 my-1.5 h-px"
            style={{ background: "var(--bordure)" }}
          />
          {entrees.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              role="menuitem"
              onClick={fermer}
              className="flex items-center gap-[11px] rounded-[8px] px-3.5 py-2.5 text-[14px] transition hover:opacity-70"
            >
              <Icone nom={e.icone} taille={17} />
              <span>{e.titre}</span>
            </Link>
          ))}
          <div
            className="mx-2 my-1.5 h-px"
            style={{ background: "var(--bordure)" }}
          />
          <div className="flex items-center gap-2 px-3.5 pb-1.5 pt-1">
            <BasculeLangue />
            <BasculeMode />
          </div>
          <form
            action={seDeconnecter}
            onSubmit={sortie.quitter}
            className="px-1.5 pb-1"
          >
            <input type="hidden" name="langue" value={langue} />
            <BoutonAction
              occupe={sortie.enCours}
              className="w-full rounded-[8px] px-2 py-2.5 text-left text-[14px]"
              style={{ color: "var(--voyant)" }}
            >
              <span className="flex w-full items-center gap-[11px]">
                <IconeSortie taille={17} />
                <span>{d.commun.seDeconnecter}</span>
              </span>
            </BoutonAction>
          </form>
        </div>
      ) : null}

      {/* ── Téléphone : la feuille qui monte ── */}
      {ouvert ? (
        <div
          className="fixed inset-0 z-50 flex items-end lg:hidden"
          style={{ background: "rgb(10 16 28 / 0.42)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) fermer()
          }}
        >
          <div
            role="menu"
            className="feuille w-full rounded-t-[18px] pb-6 pt-2"
            style={{
              background: "var(--surface)",
              color: "var(--texte)",
              transform: glisse ? `translateY(${glisse}px)` : undefined,
              transition: tire ? "none" : "transform .19s ease-out",
            }}
            onTouchStart={(e) => {
              depart.current = e.touches[0].clientY
              setTire(true)
            }}
            onTouchMove={(e) => {
              if (depart.current === null) return
              const dy = e.touches[0].clientY - depart.current
              // Vers le haut, rien : la feuille est déjà en butée, et la
              // tirer plus haut ne veut rien dire.
              setGlisse(dy > 0 ? dy : 0)
            }}
            onTouchEnd={() => {
              setTire(false)
              depart.current = null
              // Un tiers de la feuille, ou cent points : au-delà, le geste
              // disait bien « referme ». En deçà, elle revient en place —
              // une feuille qui se ferme sur une hésitation est pire que
              // celle qui ne se ferme pas.
              if (glisse > 100) fermerEnGlissant()
              else setGlisse(0)
            }}
          >
            <div
              aria-hidden
              className="mx-auto mb-3.5 mt-1.5 h-1 w-[42px] rounded-sm"
              style={{ background: "var(--bordure)" }}
            />

            <div className="flex items-center gap-3.5 px-[18px] pb-4">
              <Avatar nom={prenom ?? "?"} photoUrl={photoUrl} taille={54} statique />
              <span>
                <span className="block text-[17px] font-medium">
                  {nomComplet}
                </span>
                <span className="doux mt-0.5 block text-[13px]">
                  {sousTitre}
                </span>
              </span>
            </div>

            <div style={{ borderTop: "1px solid var(--bordure)" }}>
              {entrees.map((e) => (
                <Link
                  key={e.href}
                  href={e.href}
                  role="menuitem"
                  onClick={fermer}
                  className="flex items-center gap-3.5 px-[18px] py-[15px]"
                  style={{ borderBottom: "1px solid var(--bordure)" }}
                >
                  <Icone nom={e.icone} taille={21} />
                  <span className="flex-1">
                    <span className="block text-[15px]">{e.titre}</span>
                    <span className="doux mt-0.5 block text-[12px]">
                      {e.detail}
                    </span>
                  </span>
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="block shrink-0"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 px-[18px] py-3">
              <BasculeLangue />
              <BasculeMode />
            </div>

            <form
              action={seDeconnecter}
              onSubmit={sortie.quitter}
              className="px-[18px]"
            >
              <input type="hidden" name="langue" value={langue} />
              <BoutonAction
                occupe={sortie.enCours}
                className="w-full py-1 text-left text-[15px]"
                style={{ color: "var(--voyant)" }}
              >
                <span className="flex w-full items-center gap-3.5">
                  <IconeSortie taille={21} />
                  <span>{d.commun.seDeconnecter}</span>
                </span>
              </BoutonAction>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Les quatre pictogrammes du canevas, au trait, sans aucun symbole proscrit. */
function Icone({ nom, taille }: { nom: Icone; taille: number }) {
  const commun = {
    width: taille,
    height: taille,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "block shrink-0",
  }

  if (nom === "profil") {
    return (
      <svg {...commun}>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    )
  }
  if (nom === "enfants") {
    return (
      <svg {...commun}>
        <circle cx="8" cy="9" r="2.8" />
        <circle cx="17" cy="10" r="2.2" />
        <path d="M3 19a5 5 0 0 1 10 0M14 19a4 4 0 0 1 7-2.6" />
      </svg>
    )
  }
  if (nom === "messages") {
    return (
      <svg {...commun}>
        <path d="M4 5.5h16v11H9l-5 4z" />
      </svg>
    )
  }
  // L'annuaire : des fiches empilées, pas une loupe. La loupe dit « chercher »
  // et vit déjà dans la barre ; ici on désigne la liste elle-même.
  if (nom === "annuaire") {
    return (
      <svg {...commun}>
        <rect x="3" y="4.5" width="18" height="6" rx="1.8" />
        <rect x="3" y="13.5" width="18" height="6" rx="1.8" />
        <path d="M7 7.5h.01M7 16.5h.01" />
      </svg>
    )
  }
  return (
    <svg {...commun}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
    </svg>
  )
}

function IconeSortie({ taille }: { taille: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block shrink-0"
    >
      <path d="M15 5V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" />
      <path d="M19 12H9m10 0-3-3m3 3-3 3" />
    </svg>
  )
}
