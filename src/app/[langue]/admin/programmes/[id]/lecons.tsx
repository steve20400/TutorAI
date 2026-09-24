"use client"

import { useActionState, useState } from "react"

import { dictionnaire, type Langue } from "@/langues"
import { enregistrerLecon, type EtatLecon } from "@/actions/programme"
import { Message } from "../../../(auth)/champs"

export type Lecon = {
  id: string
  titre: string
  competence: string | null
  theme: string | null
  renseignee: boolean
  prerequis?: string[]
  savoirs?: string[]
  savoir_faire?: string[]
  habiletes?: Record<string, string[]>
}

const ETAT_INITIAL: EtatLecon = {}

/**
 * Les leçons, dépliables une par une.
 *
 * Toutes ouvertes, la page ferait quinze écrans de haut et on ne verrait plus
 * lesquelles manquent. Fermées, l'état saute aux yeux — et c'est cet état qui
 * est l'information utile ici.
 *
 * Les habiletés ne sont pas éditables : elles forment un arbre — un verbe,
 * puis des contenus — qu'un formulaire plat écraserait. La fusion se fait en
 * base, donc celles déjà saisies survivent à un enregistrement.
 */
export function Lecons({
  langue,
  programme,
  lecons,
}: {
  langue: Langue
  programme: string
  lecons: Lecon[]
}) {
  const d = dictionnaire(langue)
  const t = d.adminPages.programmes
  const [ouverte, setOuverte] = useState<string | null>(null)

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {lecons.map((l) => (
        <section key={l.id} className="carte overflow-hidden">
          <button
            type="button"
            onClick={() => setOuverte((o) => (o === l.id ? null : l.id))}
            className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
          >
            <span className="min-w-0">
              <span className="doux block text-[11px]">
                {t.lecon} {l.id}
                {l.theme ? ` · ${l.theme}` : ""}
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">
                {l.titre}
              </span>
            </span>
            <span className={l.renseignee ? "badge-actif" : "badge-eteint"}>
              {l.renseignee ? t.renseignee : t.aRemplir}
            </span>
          </button>

          {ouverte === l.id ? (
            <FormulaireLecon
              langue={langue}
              programme={programme}
              lecon={l}
              t={t}
              commun={d.commun}
            />
          ) : null}
        </section>
      ))}
    </div>
  )
}

function FormulaireLecon({
  langue,
  programme,
  lecon,
  t,
  commun,
}: {
  langue: Langue
  programme: string
  lecon: Lecon
  t: ReturnType<typeof dictionnaire>["adminPages"]["programmes"]
  commun: ReturnType<typeof dictionnaire>["commun"]
}) {
  const [etat, action, enCours] = useActionState(enregistrerLecon, ETAT_INITIAL)

  return (
    <form
      action={action}
      className="flex flex-col gap-4 border-t px-4 pb-4 pt-4"
      style={{ borderColor: "var(--bordure)" }}
    >
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="programme" value={programme} />
      <input type="hidden" name="lecon" value={lecon.id} />

      <Zone
        nom="prerequis"
        titre={t.prerequis}
        aide={t.prerequisAide}
        valeur={lecon.prerequis}
      />
      <Zone
        nom="savoirs"
        titre={t.savoirs}
        aide={t.savoirsAide}
        valeur={lecon.savoirs}
      />
      <Zone
        nom="savoirFaire"
        titre={t.savoirFaire}
        aide={t.savoirFaireAide}
        valeur={lecon.savoir_faire}
      />

      {/* Ce qui existe déjà mais ne se modifie pas ici : on le montre, pour
          que personne ne croie l'avoir perdu. */}
      {lecon.habiletes && Object.keys(lecon.habiletes).length > 0 ? (
        <div
          className="rounded-[8px] px-3 py-2.5 text-[12px] leading-relaxed"
          style={{ background: "color-mix(in srgb, var(--texte) 4%, var(--fond))" }}
        >
          <span className="doux">
            {Object.keys(lecon.habiletes).join(" · ")}
          </span>
        </div>
      ) : null}

      <Message erreur={etat.erreur} info={etat.info} />

      <button type="submit" disabled={enCours} className="bt1 self-start px-4 py-2">
        {enCours ? commun.enCours : t.enregistrer}
      </button>
    </form>
  )
}

function Zone({
  nom,
  titre,
  aide,
  valeur,
}: {
  nom: string
  titre: string
  aide: string
  valeur?: string[]
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-medium">{titre}</span>
      <span className="doux text-[11.5px]">{aide}</span>
      <textarea
        name={nom}
        rows={3}
        defaultValue={(valeur ?? []).join("\n")}
        spellCheck={false}
        className="champ mt-1 px-3 py-2 text-[13px] leading-relaxed"
      />
    </label>
  )
}
