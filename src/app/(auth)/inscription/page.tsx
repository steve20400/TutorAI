import Link from "next/link"
import { CadreAuth } from "../cadre"

/**
 * Choix du rôle — la première question posée à qui arrive sur l'application.
 *
 * Elle est posée avant le formulaire, et pas comme une liste déroulante au
 * milieu des champs : le rôle détermine l'espace, le registre visuel et les
 * droits. Se tromper ici et s'en apercevoir après coup coûte un compte à
 * supprimer.
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
    <CadreAuth>
      <header>
        <h1 className="text-2xl font-medium">Créer un compte</h1>
        <p className="doux mt-1 text-sm">Pour commencer, tu es…</p>
      </header>

      <div className="flex flex-col gap-3">
        {ROLES.map((r) => (
          <Link
            key={r.cle}
            href={`/inscription/${r.cle}`}
            className="carte p-5 transition hover:brightness-95"
          >
            <div className="font-medium">{r.titre}</div>
            <div className="doux mt-0.5 text-sm">{r.detail}</div>
          </Link>
        ))}
      </div>

      <p className="doux text-center text-sm">
        Tu as déjà un compte ?{" "}
        <Link href="/connexion" className="underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </CadreAuth>
  )
}
