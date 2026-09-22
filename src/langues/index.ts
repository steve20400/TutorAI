import { fr, type Dictionnaire } from "./fr"
import { en } from "./en"

export type { Dictionnaire }

/** L'ordre compte : le premier est la langue par défaut. */
export const LANGUES = ["fr", "en"] as const
export type Langue = (typeof LANGUES)[number]
export const LANGUE_PAR_DEFAUT: Langue = "fr"

const DICTIONNAIRES: Record<Langue, Dictionnaire> = { fr, en }

export function estLangue(valeur: string | undefined): valeur is Langue {
  return valeur !== undefined && (LANGUES as readonly string[]).includes(valeur)
}

export function dictionnaire(langue: Langue): Dictionnaire {
  return DICTIONNAIRES[langue]
}

/**
 * Préfixe un chemin interne par la langue.
 *
 * Toutes les adresses de l'application passent par ici. Un href écrit à la
 * main sans préfixe renverrait vers une page que le middleware redirigera
 * aussitôt — donc un aller-retour inutile, et la langue choisie perdue si le
 * navigateur n'a pas la bonne préférence.
 */
export function chemin(langue: Langue, route: string): string {
  const propre = route.startsWith("/") ? route : `/${route}`
  return propre === "/" ? `/${langue}` : `/${langue}${propre}`
}

/**
 * Retire le préfixe de langue d'un chemin.
 * Utile pour changer de langue en restant sur la même page.
 */
export function cheminSansLangue(route: string): string {
  const morceaux = route.split("/")
  if (estLangue(morceaux[1])) return "/" + morceaux.slice(2).join("/")
  return route
}

/**
 * Choisit une langue à partir de l'en-tête Accept-Language du navigateur.
 *
 * Lecture volontairement sommaire : on cherche le premier code de langue
 * reconnu, sans gérer les pondérations `q=`. Un anglophone de Bamenda dont le
 * téléphone est configuré en anglais arrive en anglais ; tous les autres cas
 * tombent sur le français, qui reste la langue par défaut.
 */
export function langueDepuisEntete(entete: string | null): Langue {
  if (!entete) return LANGUE_PAR_DEFAUT
  for (const morceau of entete.split(",")) {
    const code = morceau.trim().split(";")[0]?.split("-")[0]?.toLowerCase()
    if (estLangue(code)) return code
  }
  return LANGUE_PAR_DEFAUT
}

/**
 * Remplace les trous d'un gabarit : remplir("Bonjour {prenom}", {prenom}).
 *
 * Les textes sont des chaînes et non des fonctions, parce qu'un dictionnaire
 * traverse la frontière serveur → client : une fonction ne se sérialise pas,
 * et la page entière tombe en erreur 500.
 */
export function remplir(
  gabarit: string,
  valeurs: Record<string, string | number>,
): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, cle: string) =>
    String(valeurs[cle] ?? ""),
  )
}

/**
 * Choisit la bonne forme selon le nombre, puis remplit {n}.
 *
 * Les règles diffèrent d'une langue à l'autre — le français met zéro au
 * singulier, l'anglais au pluriel — et `Intl.PluralRules` les connaît déjà.
 * Écrire `n > 1 ? "s" : ""` à la main marche en français et se trompe ailleurs.
 */
export function pluriel(
  langue: Langue,
  n: number,
  formes: { one: string; other: string },
): string {
  const regle = new Intl.PluralRules(langue).select(n)
  const gabarit = regle === "one" ? formes.one : formes.other
  return remplir(gabarit, { n })
}

/**
 * Langue transmise par un formulaire.
 *
 * Chaque formulaire porte un champ caché `langue`. Sans lui, une action
 * serveur ne saurait ni dans quelle langue rédiger son message, ni vers quelle
 * adresse rediriger — et renverrait un anglophone sur une page française.
 */
export function langueDeFormulaire(donnees: FormData): Langue {
  const brut = String(donnees.get("langue") ?? "")
  return estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
}
