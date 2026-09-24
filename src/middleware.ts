import { NextResponse, type NextRequest } from "next/server"

import {
  estLangue,
  langueDepuisEntete,
  type Langue,
} from "@/langues"
import { actualiserSession } from "@/lib/supabase/middleware"

/** Mémorise la langue choisie d'une visite à l'autre. */
const COOKIE_LANGUE = "tutela-langue"
const UN_AN = 60 * 60 * 24 * 365

/**
 * Toute adresse porte sa langue : /fr/connexion, /en/connexion.
 *
 * Le choix de l'URL plutôt que d'un cookie n'est pas esthétique. Un cookie ne
 * vaut que pour l'appareil qui le porte : un parent de Bamenda qui partage le
 * lien d'inscription dans un groupe WhatsApp l'enverrait en français, et le
 * destinataire tomberait sur une page qu'il ne lit pas. Avec la langue dans
 * l'adresse, le lien arrive dans la langue de celui qui l'a envoyé.
 */
function langueVoulue(requete: NextRequest): Langue {
  const memorisee = requete.cookies.get(COOKIE_LANGUE)?.value
  if (estLangue(memorisee)) return memorisee
  return langueDepuisEntete(requete.headers.get("accept-language"))
}

export async function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname
  const premierSegment = chemin.split("/")[1]

  if (!estLangue(premierSegment)) {
    const langue = langueVoulue(requete)
    const url = requete.nextUrl.clone()
    url.pathname = `/${langue}${chemin === "/" ? "" : chemin}`
    return NextResponse.redirect(url)
  }

  const reponse = await actualiserSession(requete, premierSegment)

  // On n'écrit le cookie qu'une fois la langue effectivement servie : sinon un
  // aller-retour de redirection pourrait figer une langue jamais affichée.
  if (requete.cookies.get(COOKIE_LANGUE)?.value !== premierSegment) {
    reponse.cookies.set(COOKIE_LANGUE, premierSegment, {
      maxAge: UN_AN,
      sameSite: "lax",
      path: "/",
    })
  }

  return reponse
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     *   - les fichiers internes de Next (_next/static, _next/image)
     *   - l'API, qui n'a pas de langue
     *   - les fichiers statiques (favicon, images, manifeste PWA)
     *   - `sw.js`, le Service Worker
     *
     * Ce dernier mérite son nom en toutes lettres. Sans lui, le middleware
     * redirigeait /sw.js vers /fr/sw.js, qui n'existe pas : le navigateur
     * recevait une page HTML à la place du script, refusait de l'enregistrer,
     * et la reprise des envois ne fonctionnait pas — sans qu'aucune erreur
     * n'apparaisse nulle part.
     *
     * Un Service Worker doit de plus être servi depuis la racine : sa portée
     * est limitée au dossier d'où il vient, et depuis /fr/ il ne verrait pas
     * les pages anglaises.
     *
     * La liste des extensions couvre désormais tout ce que `public/` peut
     * contenir, et non les seules images. Le même piège s'est refermé une
     * troisième fois avec `/carte/osm.json`, le style de la carte : redirigé
     * vers `/fr/carte/osm.json`, il rendait une page HTML, MapLibre recevait
     * du HTML au lieu d'un style, et la carte restait vide — sans qu'aucune
     * erreur ne le dise.
     *
     * Une page n'a jamais d'extension. Tout ce qui en porte une est un
     * fichier, et un fichier n'a pas de langue.
     */
    "/((?!_next/static|_next/image|api/|sw\\.js|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|json|txt|xml|webmanifest|woff|woff2|ttf|otf|css|js|map|pdf|mp4|webm)$).*)",
  ],
}
