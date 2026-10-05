"use client"

import Link from "next/link"
import { useState } from "react"

import { Marque } from "@/composants/marque"
import { MenuCompte, type Entree } from "./menu-compte"
import { BoutonLoupe, RechercheBureau, RechercheTelephone } from "./recherche"
import { ChoixVille } from "./ville"
import { ENCRE, ENCRE_DOUX, ENCRE_TEXTE } from "./encre"
import { chemin, type Dictionnaire, type Langue } from "@/langues"

/**
 * La barre de l'application, à l'encre, sur tous les écrans connectés.
 *
 * Reprise de `Main.dc.html` pour le grand écran — 64 px de haut, le logo, le
 * champ de recherche de 290 px, la ville, puis le compte — et de
 * `AnnuaireTel.dc.html` pour le téléphone, où elle tombe à 56 px et où la
 * recherche se replie derrière son pictogramme.
 *
 * Sur téléphone, elle a deux lignes au lieu d'une, et c'est tout le propos de
 * sa réécriture. Le champ de recherche se dépliait PAR-DESSUS la barre : il
 * recouvrait le nom de l'application d'un côté, la photo de profil de
 * l'autre. On cherchait en ayant effacé l'en-tête. Il ouvre maintenant une
 * seconde ligne en dessous — la barre grandit, rien ne se recouvre, et le
 * champ a toute la largeur plutôt qu'un tiers.
 *
 * C'est aussi pour cela que ce composant est passé au navigateur : l'état
 * « la recherche est ouverte » décide de la hauteur de la barre, donc il ne
 * peut plus vivre dans le champ lui-même.
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

  // Ouverte d'emblée si une recherche est déjà en cours : on doit pouvoir
  // corriger « mathématiqes » sans d'abord retrouver la loupe.
  const [chercheOuverte, setChercheOuverte] = useState(Boolean(recherche))

  return (
    // `sticky top-0` et non `fixed` : collée, elle reste visible quand on
    // descend, mais elle garde sa place dans le flux. En `fixed` elle sortirait
    // du flux et se poserait PAR-DESSUS la première ligne de chaque page — il
    // faudrait alors creuser un vide de sa hauteur sous elle, sur chaque
    // écran, et le réajuster ici le jour où elle grandit. C'est le même défaut
    // que la recherche qui recouvrait le logo, à l'échelle de l'application.
    //
    // Opaque, et pas seulement sombre : le contenu passe dessous, et une barre
    // translucide laisserait lire deux écrans à la fois.
    <header
      className="sticky top-0 z-40 flex flex-shrink-0 flex-col"
      style={{ background: ENCRE, color: ENCRE_TEXTE }}
    >
      <div className="flex h-14 items-center gap-2.5 px-3.5 lg:h-16 lg:gap-[22px] lg:px-[26px]">
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
          <RechercheBureau
            valeur={recherche}
            placeholder={t.recherchePlaceholder}
            etiquette={t.rechercher}
            valider={t.rechercher}
            langue={langue}
            encre={ENCRE_TEXTE}
            encreDoux={ENCRE_DOUX}
          />
        ) : null}

        <div className="flex-1" />

        {chercher ? (
          <BoutonLoupe
            ouvert={chercheOuverte}
            etiquette={t.rechercher}
            encreDoux={ENCRE_DOUX}
            surClic={() => setChercheOuverte((o) => !o)}
          />
        ) : null}

        {chercher && villes.length > 0 ? (
          <ChoixVille
            villes={villes}
            active={villeActive}
            etiquette={t.ville}
            toutLePays={t.toutLePays}
            langue={langue}
            encreDoux={ENCRE_DOUX}
          />
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
      </div>

      {/* La seconde ligne, téléphone seulement. */}
      {chercher && chercheOuverte ? (
        <RechercheTelephone
          valeur={recherche}
          placeholder={t.recherchePlaceholder}
          etiquette={t.rechercher}
          valider={t.rechercher}
          langue={langue}
          encre={ENCRE_TEXTE}
          encreDoux={ENCRE_DOUX}
          surFermer={() => setChercheOuverte(false)}
        />
      ) : null}
    </header>
  )
}
