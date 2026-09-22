import Link from "next/link"
import { CadreAuth } from "../cadre"

/**
 * Choix du rôle — la première question posée à qui arrive sur l'application.
 *
 * Elle est posée avant le formulaire, et pas comme une liste déroulante au
 * milieu des champs : le rôle détermine l'espace et les droits. Se tromper ici
 * et s'en apercevoir après coup coûte un compte à supprimer.
 */
const ROLES = [
  {
    cle: "eleve",
    titre: "Je suis élève",
    detail: "Réviser, être interrogé sur mon programme",
  },
  {
    cle: "parent",
    titre: "Je suis parent",
    detail: "Suivre mon enfant, trouver un répétiteur de confiance",
  },
  {
    cle: "repetiteur",
    titre: "Je suis répétiteur",
    detail: "Donner des cours à distance, trouver des élèves",
  },
] as const

export default function ChoixDuRole() {
  return (
    <CadreAuth etiquette="Inscription" phare="Commençons.">
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          Créer un compte
        </h2>
        <p className="doux mt-1.5 text-sm">Pour commencer, tu es…</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {ROLES.map((r) => (
          <Link
            key={r.cle}
            href={`/inscription/${r.cle}`}
            className="choix-role"
          >
            <span className="font-medium">{r.titre}</span>
            <span className="doux mt-0.5 block text-sm">{r.detail}</span>
          </Link>
        ))}
      </div>

      <p className="doux text-sm">
        Tu as déjà un compte ?{" "}
        <Link
          href="/connexion"
          className="underline underline-offset-4"
          style={{ color: "var(--texte)" }}
        >
          Se connecter
        </Link>
      </p>
    </CadreAuth>
  )
}
