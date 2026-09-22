import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // PWA : le manifeste et le service worker sont servis depuis /public.
  // Voir docs/SPEC_APPLICATION.md §11 — pas d'application native en v1.
  reactStrictMode: true,

  // Le prompt du tuteur est lu sur disque à l'exécution pour qu'il n'existe
  // qu'à un seul endroit (src/data/prompt-tuteur.md). Sans cette ligne, le
  // fichier n'est pas embarqué dans le build de production.
  outputFileTracingIncludes: {
    "/api/seance/**": ["./src/data/prompt-tuteur.md"],
  },

  /**
   * En-têtes de sécurité, posés avant la première mise en ligne.
   *
   * En localhost ils ne servaient à rien. Dès que le site répond sur un nom
   * public, ils deviennent la seule chose qui empêche un tiers de se servir de
   * l'application à l'insu de celui qui l'utilise.
   *
   * `frame-ancestors 'none'` est le plus important ici. Sans lui, n'importe
   * quel site peut charger TUTELA dans une iframe invisible, poser ses propres
   * boutons par-dessus, et faire cliquer un parent sur « Refuser le dossier »
   * ou « Terminer la séance » en lui faisant croire qu'il clique ailleurs.
   * Sur un produit où un adulte valide qui approche un enfant, ce détournement
   * ne serait pas une curiosité technique.
   */
  async headers() {
    return [
      {
        source: "/:chemin*",
        headers: [
          // Remplace X-Frame-Options, qui ne connaît pas la liste d'origines.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          // Sans lui, un fichier déposé par un répétiteur et servi en
          // `text/plain` peut être re-deviné en HTML par le navigateur, donc
          // exécuté. Les pièces justificatives sont précisément des fichiers
          // que des inconnus téléversent.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // L'URL d'une séance contient son identifiant. Il ne doit pas partir
          // dans l'en-tête Referer vers un site tiers.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // La caméra et le micro restent ouverts à l'application elle-même —
          // la salle de cours en a besoin — mais à personne d'autre, et surtout
          // à aucune iframe embarquée.
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
