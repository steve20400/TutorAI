import Link from "next/link"

import { Logo } from "@/composants/marque"
import { BasculeLangue } from "@/composants/langue"
import { BasculeMode } from "@/composants/theme"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { exigerModulePage } from "@/lib/parametres"
import { Essai } from "./essai"

/**
 * Le tuteur, sans compte.
 *
 * Quelqu'un entend parler de TUTELA et veut voir avant de s'engager. On lui
 * ouvre la porte sans rien lui demander : ni nom, ni adresse, ni mot de passe.
 *
 * Et on lui dit AVANT ce qu'il perd — la conversation disparaît avec l'onglet.
 * Le dire après vingt minutes de travail ferait fuir quelqu'un qui serait
 * peut-être resté.
 */
export default async function PageEssai({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT

  // Le module éteint, cette page n'existe pas — comme l'écran du tuteur.
  await exigerModulePage("ia_active", langue)
  const d = dictionnaire(langue)

  return (
    <div
      className="relative flex min-h-dvh flex-col"
      style={{ background: "var(--fond)", color: "var(--texte)" }}
    >
      <div className="motif-fond" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-7">
        <Link href={chemin(langue, "/")} className="transition hover:opacity-80">
          <Logo taille={24} />
        </Link>
        <div className="flex items-center gap-1">
          <BasculeLangue />
          <BasculeMode />
        </div>
      </header>

      <Essai langue={langue} />

      <footer className="relative z-10 px-5 pb-6 sm:px-7">
        <p className="doux mx-auto max-w-md text-center text-[12px] leading-relaxed">
          {d.essai.pied}{" "}
          <Link
            href={chemin(langue, "/inscription")}
            className="underline underline-offset-4"
            style={{ color: "var(--texte)" }}
          >
            {d.essai.creerUnCompte}
          </Link>
        </p>
      </footer>
    </div>
  )
}
