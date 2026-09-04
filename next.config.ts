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
}

export default nextConfig
