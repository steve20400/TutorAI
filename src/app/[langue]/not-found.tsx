import { cookies } from "next/headers"
import Link from "next/link"

import { Marque } from "@/composants/marque"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"

/**
 * Page introuvable.
 *
 * Next sert autrement la sienne : en anglais, sans la marque, sans thème.
 * Quelqu'un qui recopie mal une adresse partagée dans un groupe tomberait sur
 * un écran qui n'appartient à aucun produit — et conclurait que le lien est
 * mort, pas qu'il s'est trompé d'une lettre.
 *
 * La langue vient du cookie posé par le middleware : `not-found.tsx` ne reçoit
 * pas les paramètres de route, donc le segment `/fr/` ou `/en/` de l'adresse
 * n'est pas lisible ici.
 *
 * À noter : un visiteur SANS session ne voit pas cette page. Le middleware
 * ferme toutes les routes non publiques avant qu'elles ne s'exécutent, et le
 * renvoie donc vers la connexion. C'est voulu — la garde est fermée par
 * défaut, et lui répondre « cette page n'existe pas » plutôt que « connectez-
 * vous » reviendrait à lui dire quelles adresses existent.
 */
export default async function Introuvable() {
  const boite = await cookies()
  const brut = boite.get("tutela-langue")?.value
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.introuvable

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--fond)", color: "var(--texte)" }}
    >
      <div className="motif-fond" />

      <div className="relative flex flex-col items-center">
        <Marque taille={54} />

        <span
          className="doux mt-6 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          {t.code}
        </span>

        <h1 className="mt-2 max-w-[420px] text-[22px] font-medium leading-snug">
          {t.titre}
        </h1>

        <p className="doux mt-3 max-w-[380px] text-[13.5px] leading-relaxed">
          {t.detail}
        </p>

        <Link href={chemin(langue, "/")} className="bt1 mt-7">
          {t.retour}
        </Link>
      </div>
    </main>
  )
}
