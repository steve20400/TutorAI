"use client"

import { useEffect, useState } from "react"

import { Avatar } from "@/composants/avatar"
import { Jauge } from "@/composants/jauge"
import { dictionnaire, type Langue } from "@/langues"

type Parent = {
  id: string
  prenom: string | null
  photo_url: string | null
  porte: boolean
  fournit: boolean
  provisoire: boolean
}

type Etat = {
  actif: boolean
  etat: string
  part: number
  payeur: string | null
  donnees: Parent[]
}

/**
 * La jauge de l'élève, et le choix de l'adulte qui porte ses séances.
 *
 * Une seule jauge : l'élève n'a pas à comprendre une comptabilité, il a
 * besoin de savoir s'il peut continuer.
 *
 * Rien ne s'affiche tant que le module de jetons est éteint. Un anneau plein
 * qui ne bouge jamais n'est pas une information, c'est du bruit.
 *
 * Et c'est ici, dans ce même panneau, qu'un enfant rattaché à plusieurs
 * adultes passe de l'un à l'autre — au moment exact où la question se pose,
 * plutôt que dans un écran de réglages qu'il n'ouvrira jamais.
 */
export function JaugeEleve({ langue }: { langue: Langue }) {
  const d = dictionnaire(langue)
  const t = d.jaugeEleve

  const [etat, setEtat] = useState<Etat | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)

  const lire = async () => {
    try {
      const r = await fetch("/api/mes-parents")
      setEtat((await r.json()) as Etat)
    } catch {
      setEtat(null)
    }
  }

  useEffect(() => {
    void lire()
  }, [])

  if (!etat?.actif) return null

  const choisir = async (id: string) => {
    setEnCours(id)
    try {
      await fetch(`/api/mes-parents/${id}/porter`, { method: "POST" })
      await lire()
    } finally {
      setEnCours(null)
    }
  }

  // Ceux qui refusent de fournir ne sont pas proposés : les montrer
  // grisés dirait à l'enfant qu'un adulte de sa famille a refusé de payer,
  // ce qui ne le regarde pas et ne l'aide en rien.
  const proposables = etat.donnees.filter((p) => p.fournit && !p.provisoire)

  return (
    <Jauge
      part={etat.part}
      titre={t.titre}
      description={etat.etat === "epuise" ? t.epuise : t.detail}
      etiquette={t.etiquette}
    >
      {proposables.length > 1 ? (
        <>
          <div className="doux text-[11.5px]">{t.quiPaie}</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {proposables.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={enCours !== null}
                onClick={() => void choisir(p.id)}
                className="flex items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left transition"
                style={{
                  background:
                    etat.payeur === p.id
                      ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                      : "transparent",
                }}
              >
                <Avatar
                  nom={p.prenom ?? "?"}
                  photoUrl={p.photo_url}
                  taille={26}
                />
                <span className="flex-1 text-[13px]">{p.prenom}</span>
                {etat.payeur === p.id ? (
                  <span className="doux text-[10.5px]">{t.enCours}</span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </Jauge>
  )
}
