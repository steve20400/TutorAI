import type { Metadata, Viewport } from "next"

import { EcranChargement } from "@/composants/chargement"
import { FournisseurLangue } from "@/langues/contexte"
import { dictionnaire, estLangue, LANGUES, LANGUE_PAR_DEFAUT } from "@/langues"
import { SCRIPT_THEME } from "@/lib/theme"
import "../globals.css"

/**
 * Racine de l'application — il n'y a pas de layout au-dessus.
 *
 * C'est ici que vit <html>, parce que l'attribut `lang` doit porter la langue
 * de la page : un lecteur d'écran prononce autrement du français annoncé comme
 * de l'anglais, et le correcteur du navigateur se trompe de dictionnaire.
 */
export function generateStaticParams() {
  return LANGUES.map((langue) => ({ langue }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>
}): Promise<Metadata> {
  const { langue } = await params
  const d = dictionnaire(estLangue(langue) ? langue : LANGUE_PAR_DEFAUT)

  return {
    title: d.meta.titre,
    description: d.meta.description,
    manifest: "/manifest.webmanifest",
    applicationName: d.meta.titre,
    icons: { icon: "/favicon.png", apple: "/icones/apple-touch-icon.png" },
    appleWebApp: {
      capable: true,
      title: d.meta.titre,
      statusBarStyle: "default",
    },
    // Produit destiné à des mineurs : pas d'indexation, pas d'aperçu partageable.
    robots: { index: false, follow: false },
  }
}

/**
 * `viewportFit: cover` + `maximum-scale: 1` évitent le zoom involontaire au
 * focus des champs sur iOS.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1626" },
  ],
}

export default async function LayoutRacine({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params

  // Le middleware ne laisse passer que « fr » et « en » ; ce repli existe pour
  // que la page ne s'effondre pas si cette garantie saute un jour.
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  return (
    <html lang={d.meta.htmlLang} data-theme="indigo">
      <head>
        {/* Avant tout rendu, sinon la page clignote dans le mauvais thème. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-dvh antialiased">
        <FournisseurLangue langue={langue} d={d}>
          <EcranChargement />
          {children}
        </FournisseurLangue>
      </body>
    </html>
  )
}
