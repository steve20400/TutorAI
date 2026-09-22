"use client"

import { useState } from "react"

import { remplir, type Dictionnaire, type Langue } from "@/langues"
import { enregistrerFacturation } from "@/actions/admin"

type Valeurs = {
  mode: string
  montant: number
  delai: number
}

/**
 * Réglages de facturation.
 *
 * La barre d'enregistrement n'apparaît que s'il y a une modification : un
 * bouton planté en permanence laisse un doute permanent — ai-je enregistré ou
 * pas ? Ici, son absence est elle-même une information.
 */
export function FormulaireFacturation({
  langue,
  d,
  initiales,
  portefeuilleActif,
}: {
  langue: Langue
  d: Dictionnaire
  initiales: Valeurs
  /** Le pourcentage exige que l'argent transite : sans porte-monnaie, il est
      indisponible, dans l'interface comme côté serveur. */
  portefeuilleActif: boolean
}) {
  const t = d.adminPages.facturation
  const [v, poser] = useState<Valeurs>(initiales)

  const change =
    v.mode !== initiales.mode ||
    v.montant !== initiales.montant ||
    v.delai !== initiales.delai

  const nbChangements =
    (v.mode !== initiales.mode ? 1 : 0) +
    (v.montant !== initiales.montant ? 1 : 0) +
    (v.delai !== initiales.delai ? 1 : 0)

  return (
    <form action={enregistrerFacturation} className="flex flex-col gap-4">
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="mode" value={v.mode} />

      <div className="flex flex-wrap gap-3">
        {(
          [
            ["par_eleve_actif", t.modeEleve, t.modeEleveDetail, true],
            ["pourcentage_gains", t.modePourcentage, t.modePourcentageDetail, portefeuilleActif],
          ] as const
        ).map(([cle, titre, detail, disponible]) => (
          <button
            key={cle}
            type="button"
            disabled={!disponible}
            onClick={() => poser({ ...v, mode: cle })}
            className="min-w-[180px] flex-1 rounded-[9px] p-3 text-left transition"
            style={{
              border:
                v.mode === cle
                  ? "1.5px solid var(--accent)"
                  : "1px solid var(--bordure)",
              background: v.mode === cle ? "var(--surface)" : "transparent",
              opacity: disponible ? 1 : 0.45,
              cursor: disponible ? "pointer" : "not-allowed",
            }}
          >
            <div className="text-[13px] font-semibold">{titre}</div>
            <div className="doux mt-1 text-[11.5px] leading-snug">{detail}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[160px] flex-1">
          <span className="doux block text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.montant}
          </span>
          <span
            className="mt-1.5 flex items-baseline gap-2 rounded-[8px] px-3 py-2"
            style={{
              border:
                v.montant !== initiales.montant
                  ? "1.5px solid var(--accent)"
                  : "1px solid var(--bordure)",
            }}
          >
            <input
              name="montant"
              type="number"
              min={0}
              step={500}
              value={v.montant}
              onChange={(e) => poser({ ...v, montant: Number(e.target.value) })}
              className="w-20 bg-transparent font-mono text-[17px] font-semibold outline-none"
            />
            <span className="doux text-[12px]">{t.parEleve}</span>
          </span>
          {v.montant !== initiales.montant ? (
            <span
              className="mt-1 block text-[10.5px]"
              style={{ color: "var(--voyant)" }}
            >
              {remplir(t.modifie, { ancien: initiales.montant })}
            </span>
          ) : null}
        </label>

        <label className="min-w-[160px] flex-1">
          <span className="doux block text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.delai}
          </span>
          <span
            className="mt-1.5 flex items-baseline gap-2 rounded-[8px] px-3 py-2"
            style={{
              border:
                v.delai !== initiales.delai
                  ? "1.5px solid var(--accent)"
                  : "1px solid var(--bordure)",
            }}
          >
            <input
              name="delai"
              type="number"
              min={0}
              max={90}
              value={v.delai}
              onChange={(e) => poser({ ...v, delai: Number(e.target.value) })}
              className="w-14 bg-transparent font-mono text-[17px] font-semibold outline-none"
            />
            <span className="doux text-[12px]">{t.jours}</span>
          </span>
        </label>
      </div>

      <p className="doux text-[12px] leading-relaxed">{t.portee}</p>

      {change ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-[9px] p-3"
          style={{
            background: "color-mix(in srgb, var(--voyant) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--voyant) 35%, transparent)",
          }}
        >
          <div className="min-w-[150px] flex-1">
            <div
              className="text-[12.5px] font-semibold"
              style={{ color: "var(--voyant)" }}
            >
              {nbChangements === 1
                ? t.nonEnregistre.one
                : remplir(t.nonEnregistre.other, { n: nbChangements })}
            </div>
            <div className="doux mt-0.5 text-[11.5px]">{t.prochainCycle}</div>
          </div>
          <button type="button" onClick={() => poser(initiales)} className="bt3">
            {t.annuler}
          </button>
          <button type="submit" className="bt1">
            {t.enregistrer}
          </button>
        </div>
      ) : null}
    </form>
  )
}
