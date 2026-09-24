"use client"

import { useEffect, useRef, useState } from "react"

import { TexteMathematique } from "@/composants/texte-mathematique"
import { dictionnaire, type Langue } from "@/langues"

type Bulle = { role: "utilisateur" | "tuteur"; contenu: string }

/**
 * La conversation d'essai.
 *
 * Elle vit ici, en mémoire, et nulle part ailleurs : rien n'est écrit en base,
 * c'est la promesse faite sur l'écran. Elle est renvoyée au service à chaque
 * message, et elle disparaît avec l'onglet.
 *
 * Le compteur de jetons n'est pas affiché en chiffres. « Il te reste 18 400
 * jetons » ne veut rien dire pour quelqu'un qui découvre — une barre qui se
 * vide, si.
 */
export function Essai({ langue }: { langue: Langue }) {
  const d = dictionnaire(langue)
  const t = d.essai

  const [bulles, setBulles] = useState<Bulle[]>([])
  const [saisie, setSaisie] = useState("")
  const [enAttente, setEnAttente] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [essai, setEssai] = useState<string | null>(null)
  const [budget, setBudget] = useState<{ reste: number; depart: number } | null>(
    null,
  )
  const [termine, setTermine] = useState(false)

  const fin = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" })
  }, [bulles, enAttente])

  /** Ouvre l'essai au premier message, pas au chargement de la page. */
  const ouvrir = async (): Promise<string | null> => {
    if (essai) return essai
    try {
      const r = await fetch("/api/essai", { method: "POST" })
      if (!r.ok) {
        const d2 = (await r.json().catch(() => ({}))) as { erreur?: string }
        setErreur(
          d2.erreur === "trop_d_essais" ? t.tropDEssais : t.indisponible,
        )
        return null
      }
      const data = (await r.json()) as { id: string; jetonsRestants: number }
      setEssai(data.id)
      setBudget({ reste: data.jetonsRestants, depart: data.jetonsRestants })
      return data.id
    } catch {
      setErreur(t.indisponible)
      return null
    }
  }

  const envoyer = async () => {
    const contenu = saisie.trim()
    if (!contenu || enAttente || termine) return

    setErreur(null)
    setEnAttente(true)
    setSaisie("")

    const historique = bulles
    setBulles((b) => [...b, { role: "utilisateur", contenu }])

    const id = await ouvrir()
    if (!id) {
      setEnAttente(false)
      setBulles((b) => b.slice(0, -1))
      setSaisie(contenu)
      return
    }

    try {
      const r = await fetch(`/api/essai/${id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu, historique }),
      })
      const data = (await r.json()) as {
        reponse?: string
        jetonsRestants?: number | null
        code?: string
      }

      if (!r.ok || !data.reponse) {
        if (data.code === "termine") {
          setTermine(true)
          setErreur(t.termine)
        } else {
          setErreur(
            (data.code && t.pannes[data.code as keyof typeof t.pannes]) ??
              t.indisponible,
          )
          setBulles((b) => b.slice(0, -1))
          setSaisie(contenu)
        }
        return
      }

      setBulles((b) => [...b, { role: "tuteur", contenu: data.reponse! }])
      if (typeof data.jetonsRestants === "number") {
        setBudget((v) =>
          v ? { ...v, reste: data.jetonsRestants! } : v,
        )
        if (data.jetonsRestants <= 0) setTermine(true)
      }
    } catch {
      setErreur(t.indisponible)
      setBulles((b) => b.slice(0, -1))
      setSaisie(contenu)
    } finally {
      setEnAttente(false)
    }
  }

  const part = budget
    ? Math.max(0, Math.round((budget.reste / budget.depart) * 100))
    : 100

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 sm:px-7">
      {bulles.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center gap-3 py-10">
          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.01em]">
            {t.titre}
          </h1>
          <p className="doux text-[14px] leading-relaxed">{t.sousTitre}</p>
          <p
            className="mt-1 rounded-[10px] px-3 py-2.5 text-[12.5px] leading-relaxed"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            {t.avertissement}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 py-4">
          {bulles.map((b, i) => (
            <div
              key={i}
              className={
                b.role === "utilisateur"
                  ? "max-w-[85%] self-end rounded-2xl rounded-br-sm px-4 py-2.5"
                  : "max-w-[92%] self-start rounded-2xl rounded-bl-sm px-4 py-2.5"
              }
              style={
                b.role === "utilisateur"
                  ? { background: "var(--accent)", color: "var(--accent-texte)" }
                  : {
                      background:
                        "color-mix(in srgb, var(--texte) 6%, var(--fond))",
                    }
              }
            >
              <TexteMathematique texte={b.contenu} />
            </div>
          ))}

          {enAttente ? (
            <div className="self-start px-2 py-1">
              <span className="cercle-attente" aria-label={d.commun.enCours} />
            </div>
          ) : null}

          <div ref={fin} />
        </div>
      )}

      {erreur ? (
        <p
          className="mb-2 rounded-[10px] px-3 py-2.5 text-[13px] leading-relaxed"
          style={{
            background: "color-mix(in srgb, var(--erreur-texte) 10%, transparent)",
            color: "var(--erreur-texte)",
          }}
        >
          {erreur}
        </p>
      ) : null}

      {/* La barre ne dit pas un nombre de jetons — qui ne veut rien dire pour
          qui découvre — mais elle dit qu'il y a une fin, et où on en est. */}
      {budget && !termine ? (
        <div
          className="mb-2 h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: "color-mix(in srgb, var(--texte) 8%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${part}%`, background: "var(--accent)" }}
          />
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void envoyer()
        }}
        className="mb-4 flex items-end gap-2"
      >
        <textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void envoyer()
            }
          }}
          rows={1}
          disabled={termine}
          placeholder={termine ? t.terminePlaceholder : t.placeholder}
          className="champ max-h-32 min-h-[44px] flex-1 resize-none px-3 py-2.5 text-[14px]"
        />
        <button
          type="submit"
          disabled={enAttente || termine || saisie.trim().length === 0}
          className="bt1 h-[44px] shrink-0 px-4"
          aria-label={t.envoyer}
        >
          →
        </button>
      </form>
    </main>
  )
}
