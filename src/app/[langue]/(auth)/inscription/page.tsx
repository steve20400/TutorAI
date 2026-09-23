import Link from "next/link"

import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { lireParametres } from "@/lib/parametres"
import { CadreAuth } from "../cadre"

/**
 * Choix du rôle — la première question posée à qui arrive sur l'application.
 *
 * Elle est posée avant le formulaire, et pas comme une liste déroulante au
 * milieu des champs : le rôle détermine l'espace et les droits. Se tromper ici
 * et s'en apercevoir après coup coûte un compte à supprimer.
 */
const ORDRE = ["eleve", "parent", "repetiteur"] as const

/**
 * Essayer le tuteur sans compte.
 *
 * En creux et en pastille, pas en aplat sur toute la largeur : il invite sans
 * rivaliser avec les trois choix de rôle, qui sont la vraie question posée
 * ici. Et la mise en garde est sous le bouton, AVANT l'usage — quelqu'un qui
 * travaille vingt minutes puis perd tout en fermant l'onglet ne revient pas.
 *
 * Il n'apparaît que si le module d'IA est allumé. Un bouton qui mène à un
 * écran éteint est pire que pas de bouton.
 */
function EssaiIA({ langue, libelle, detail }: {
  langue: string
  libelle: string
  detail: string
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <Link
        href={chemin(langue as never, "/essai")}
        className="inline-flex items-center gap-2 rounded-full px-[15px] py-[9px] text-[13.5px] transition"
        style={{
          background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
          border: "1px solid var(--bordure)",
          color: "var(--texte)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 12a7.5 7.5 0 0 1-7.5 7.5H8l-4 3v-3.4A7.5 7.5 0 0 1 4 12a7.5 7.5 0 0 1 7.5-7.5h1A7.5 7.5 0 0 1 20 12z" />
          <path d="M8.5 11h7M8.5 14h4" />
        </svg>
        <span className="whitespace-nowrap">{libelle}</span>
      </Link>
      <span className="doux text-[11px]">{detail}</span>
    </div>
  )
}

export default async function ChoixDuRole({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const { ia_active } = await lireParametres()

  return (
    <CadreAuth
      langue={langue}
      etiquette={d.inscription.etiquette}
      phare={d.inscription.phare}
      action={
        ia_active ? (
          <EssaiIA
            langue={langue}
            libelle={d.inscription.essayerIA}
            detail={d.inscription.essayerIADetail}
          />
        ) : null
      }
    >
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          {d.inscription.titre}
        </h2>
        <p className="doux mt-1.5 text-sm">{d.inscription.sousTitre}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {ORDRE.map((cle) => (
          <Link
            key={cle}
            href={chemin(langue, `/inscription/${cle}`)}
            className="choix-role"
          >
            <span className="font-medium">
              {d.inscription.roles[cle].titre}
            </span>
            <span className="doux mt-0.5 block text-sm">
              {d.inscription.roles[cle].detail}
            </span>
          </Link>
        ))}
      </div>

      <p className="doux text-sm">
        {d.inscription.dejaCompte}{" "}
        <Link
          href={chemin(langue, "/connexion")}
          className="underline underline-offset-4"
          style={{ color: "var(--texte)" }}
        >
          {d.inscription.seConnecter}
        </Link>
      </p>
    </CadreAuth>
  )
}
