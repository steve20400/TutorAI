"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { supabaseNavigateur } from "@/lib/supabase/client"
import { TempsReel } from "@/composants/temps-reel"
import { chemin, remplir, type Dictionnaire, type Langue } from "@/langues"

export type Cours = {
  contrat_id: string
  matiere: string
  mon_role: "repetiteur" | "eleve" | "parent"
  autre_prenom: string | null
  /** La séance en cours, s'il y en a une. C'est elle qui fait le bouton. */
  seance_ouverte: string | null
  ouverte_le: string | null
}

/**
 * Les cours en cours, et la porte de la salle.
 *
 * La salle existait sans qu'on puisse y entrer : aucun écran ne créait de
 * séance, aucun ne disait qu'il y en avait une d'ouverte. Une salle qu'on ne
 * peut pas ouvrir est une salle qui n'existe pas.
 *
 * ── DEUX RÔLES, DEUX BOUTONS, ET CE N'EST PAS SYMÉTRIQUE ──
 *
 * Le répétiteur OUVRE. L'élève et le parent REJOIGNENT. Le parent n'a pas à
 * démarrer la séance, et surtout il ne doit pas pouvoir la clore : une séance
 * qu'on peut terminer sans trace est une séance qu'on peut effacer.
 *
 * ── POURQUOI LE TEMPS RÉEL ICI ──
 *
 * L'élève attend. Rafraîchir la page pour savoir si le cours a commencé n'est
 * pas une façon d'attendre — c'est ce qu'on fait quand l'application ne dit
 * rien. La séance apparaît donc d'elle-même.
 */
export function MesCours({
  cours,
  langue,
  d,
}: {
  cours: Cours[]
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.cours
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  const [souci, poserSouci] = useState<string | null>(null)
  const [ouvre, poserOuvre] = useState<string | null>(null)

  if (cours.length === 0) return null

  async function ouvrir(contratId: string) {
    poserSouci(null)
    poserOuvre(contratId)
    try {
      const supabase = supabaseNavigateur()
      const { data, error } = await supabase.rpc("ouvrir_seance", {
        contrat: contratId,
      })
      if (error || !data) throw new Error(error?.message ?? "seance")
      demarrer(() => router.push(chemin(langue, `/salle/${data as string}`)))
    } catch (erreur) {
      console.error("[cours] ouverture impossible :", erreur)
      poserSouci(t.echecOuverture)
      poserOuvre(null)
    }
  }

  return (
    <section className="carte p-5">
      {/* La séance s'ouvre chez l'autre : il ne doit pas recharger pour le
          savoir. */}
      <TempsReel tables={["seances_humaines"]} />

      <div className="text-[14px] font-medium">{t.titre}</div>
      <p className="doux mt-1 text-[12px] leading-relaxed">{t.detail}</p>

      {souci ? (
        <p className="mt-3 text-[12px]" style={{ color: "var(--erreur-texte)" }}>
          {souci}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        {cours.map((c) => {
          const ouverte = Boolean(c.seance_ouverte)
          return (
            <li
              key={c.contrat_id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3"
              style={{ borderColor: "var(--bordure)" }}
            >
              <div className="min-w-[150px] flex-1">
                <div className="text-[13.5px] font-medium">
                  {d.matieres[c.matiere] ?? c.matiere}
                </div>
                <p className="doux mt-0.5 text-[12px]">
                  {c.autre_prenom
                    ? remplir(
                        c.mon_role === "repetiteur" ? t.avecEleve : t.avecRepetiteur,
                        { prenom: c.autre_prenom },
                      )
                    : ""}
                </p>
                {ouverte ? (
                  <p
                    className="mt-0.5 flex items-center gap-1.5 text-[11.5px]"
                    style={{ color: "var(--accent-doux-texte)" }}
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--accent-doux-texte)" }}
                    />
                    {t.enCours}
                  </p>
                ) : null}
              </div>

              {ouverte ? (
                <Link
                  href={chemin(langue, `/salle/${c.seance_ouverte}`)}
                  className="bouton px-3.5 py-2 text-[13px]"
                >
                  {t.rejoindre}
                </Link>
              ) : c.mon_role === "repetiteur" ? (
                <button
                  type="button"
                  disabled={enCours || ouvre === c.contrat_id}
                  onClick={() => void ouvrir(c.contrat_id)}
                  className="bouton inline-flex items-center gap-2 px-3.5 py-2 text-[13px] disabled:opacity-60"
                >
                  {ouvre === c.contrat_id ? (
                    <span aria-hidden className="cercle-attente" />
                  ) : null}
                  {t.ouvrir}
                </button>
              ) : (
                // L'élève et le parent n'ouvrent pas. Le dire plutôt que de
                // laisser un bouton grisé : un bouton éteint se lit comme une
                // panne, une phrase se lit comme une règle.
                <span className="doux text-[12px]">{t.attendre}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
