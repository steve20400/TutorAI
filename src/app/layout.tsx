import type { Metadata, Viewport } from "next"

import { SCRIPT_THEME } from "@/lib/theme"
import { EcranChargement } from "./chargement"
import "./globals.css"

export const metadata: Metadata = {
  title: "TUTELA",
  description:
    "Un répétiteur vérifié. Une séance qui laisse une trace. Le soutien scolaire où un enfant n'est jamais seul avec un adulte.",
  manifest: "/manifest.webmanifest",
  applicationName: "TUTELA",
  icons: {
    icon: "/favicon.png",
    apple: "/icones/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "TUTELA",
    statusBarStyle: "default",
  },
  // Produit destiné à des mineurs : pas d'indexation, pas d'aperçu partageable.
  robots: { index: false, follow: false },
}

/**
 * Application web installable (PWA) — voir docs/SPEC_APPLICATION.md §11.
 * `viewportFit: cover` + `maximum-scale: 1` évitent le zoom involontaire au
 * focus des champs sur iOS.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Le fond du thème Indigo, clair et sombre : c'est celui qui s'applique
  // tant que l'utilisateur n'a rien choisi.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1626" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-theme="indigo">
      <head>
        {/* Avant tout rendu, sinon la page clignote dans le mauvais thème. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-dvh antialiased">
        <EcranChargement />
        {children}
      </body>
    </html>
  )
}
