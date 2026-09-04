import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mon tuteur",
  description:
    "Soutien scolaire ancré sur le programme officiel. Ton tuteur ne donne pas les réponses — il t'aide à les trouver.",
  manifest: "/manifest.webmanifest",
  applicationName: "Mon tuteur",
  icons: {
    icon: "/favicon.png",
    apple: "/icones/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Mon tuteur",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b45309" },
    { media: "(prefers-color-scheme: dark)", color: "#17150f" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
