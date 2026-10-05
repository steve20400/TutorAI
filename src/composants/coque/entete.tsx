import Link from "next/link"

import { Marque } from "@/composants/marque"
import { MenuCompte, type Entree } from "./menu-compte"
import { Recherche } from "./recherche"
import { chemin, type Dictionnaire, type Langue } from "@/langues"

/**
 * La barre de l'application, à l'encre, sur tous les écrans connectés.
 *
 * Reprise de `Main.dc.html` pour le grand écran — 64 px de haut, le logo, le
 * champ de recherche de 290 px, la ville, puis le compte — et de
 * `AnnuaireTel.dc.html` pour le téléphone, où elle tombe à 56 px et où la
 * recherche se replie derrière son pictogramme.
 *
 * L'encre ne suit pas le thème. C'est la même règle que pour la barre latérale
 * de l'administration et pour le bandeau du dossier : du texte clair y est
 * posé sur un aplat sombre, et un aplat qui s'éclaircirait en thème sombre
 * rendrait ce texte illisible. Le contraste tient contre l'aplat, pas contre
 * le thème.
 *
 * La recherche mène toujours à l'annuaire, depuis n'importe quel écran : c'est
 * le seul endroit où chercher a un sens, et un champ qui ne chercherait que
 * sur la page courante tromperait partout ailleurs.
 */
export const ENCRE = "#14203a"
export const ENCRE_TEXTE = "#eef1f7"
export const ENCRE_DOUX = "#9fb0cc"

export function Entete({
  prenom,
  nom,
  photoUrl,
  sousTitre,
  entrees,
  villes,
  villeActive,
  recherche,
  chercher,
  accueil,
  langue,
  d,
}: {
  prenom: string | null
  nom: string | null
  photoUrl: string | null
  sousTitre: string
  entrees: Entree[]
  /** Vides tant que la table des villes ne répond pas : le sélecteur saute. */
  villes: string[]
  villeActive?: string
  recherche?: string
  /**
   * Faux pour un enfant : il n'engage pas de répétiteur, et une barre de
   * recherche qui mène à l'annuaire lui proposerait un écran qui ne le
   * concerne pas.
   */
  chercher: boolean
  /** L'accueil du rôle : le logo y ramène d'un seul geste, de n'importe où. */
  accueil: string
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.coque

  return (
    <header
      className="relative z-40 flex h-14 flex-shrink-0 items-center gap-2.5 px-3.5 lg:h-16 lg:gap-[22px] lg:px-[26px]"
      style={{ background: ENCRE, color: ENCRE_TEXTE }}
    >
      {/* `--marque-reserve` vaut l'encre, et pas le fond de page.
          Les deux silhouettes du logo sont des RÉSERVES — des trous dans
          l'écran — remplies de la couleur de ce qu'il y a derrière. Sans
          cette ligne elles prenaient le crème du fond, posé sur un écran
          lui-même presque blanc : le logo devenait un rectangle vide avec un
          point orange, et les deux personnes disparaissaient. Le fichier de
          la marque prévient de ce piège ; je l'ai quand même fait. */}
      <Link
        href={chemin(langue, accueil)}
        className="relative inline-flex shrink-0 items-center gap-2 lg:gap-2.5"
        style={{ "--marque-reserve": ENCRE } as React.CSSProperties}
      >
        <span className="lg:hidden">
          <Marque taille={26} />
        </span>
        <span className="hidden lg:inline">
          <Marque taille={30} />
        </span>
        <span className="text-[15px] font-bold tracking-[0.11em] lg:text-[17px]">
          TUTELA
        </span>
      </Link>

      {chercher ? (
        <Recherche
          valeur={recherche}
          placeholder={t.recherchePlaceholder}
          etiquette={t.rechercher}
          langue={langue}
          encre={ENCRE_TEXTE}
          encreDoux={ENCRE_DOUX}
        />
      ) : null}

      <div className="flex-1" />

      {chercher && villes.length > 0 ? (
        <form
          action={chemin(langue, "/annuaire")}
          className="hidden items-center gap-[7px] text-[13.5px] lg:flex"
          style={{ color: ENCRE_DOUX }}
        >
          <Broche taille={15} />
          <label htmlFor="ville" className="sr-only">
            {t.ville}
          </label>
          <select
            id="ville"
            name="ville"
            defaultValue={villeActive ?? ""}
            className="cursor-pointer border-0 bg-transparent text-[13.5px] outline-none"
            style={{ color: ENCRE_DOUX }}
          >
            <option value="" style={{ color: "#1b2a4a" }}>
              {t.toutLePays}
            </option>
            {villes.map((v) => (
              <option key={v} value={v} style={{ color: "#1b2a4a" }}>
                {v}
              </option>
            ))}
          </select>
          <button type="submit" className="sr-only">
            {t.ville}
          </button>
        </form>
      ) : null}

      <MenuCompte
        prenom={prenom}
        nom={nom}
        photoUrl={photoUrl}
        sousTitre={sousTitre}
        entrees={entrees}
        langue={langue}
        d={d}
      />
    </header>
  )
}


function Broche({ taille }: { taille: number }) {
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
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}
