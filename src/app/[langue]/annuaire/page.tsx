import Link from "next/link"

import { Fiche, type Repetiteur } from "./fiche"
import { ReglagesRapides } from "@/composants/reglages-rapides"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { api } from "@/lib/api"
import { lireReferentiel } from "@/lib/referentiel"

type Reponse = {
  donnees: Repetiteur[]
  pagination: { page: number; parPage: number; total: number; pages: number }
}

/**
 * L'annuaire des répétiteurs vérifiés.
 *
 * Repris du canevas « Annuaire · téléphone ». Il en garde la matière — le
 * titre, le compte de contrôlés, la bande de filtres, les fiches — et lui
 * emprunte ses proportions, mais ses couleurs viennent des variables du
 * thème : le dessin est en clair, l'application a quatre combinaisons.
 *
 * Les filtres vivent dans l'adresse et non dans un état de composant. Trois
 * raisons : l'écran reste servi et n'embarque aucun JavaScript, une recherche
 * se partage par un lien, et le retour du navigateur défait un filtre au lieu
 * de quitter la page.
 *
 * Les matières et les niveaux proposés viennent du référentiel, donc de la
 * base. Les écrire ici en ferait une deuxième liste, qui divergerait de celle
 * que les répétiteurs cochent dans leur dossier.
 */
export default async function PageAnnuaire({
  params,
  searchParams,
}: {
  params: Promise<{ langue: string }>
  searchParams: Promise<{ matiere?: string; niveau?: string; page?: string }>
}) {
  const { langue: brut } = await params
  const { matiere, niveau, page } = await searchParams
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.annuaire

  const numero = Math.max(1, Number(page) || 1)

  const requete = new URLSearchParams({ page: String(numero), parPage: "20" })
  if (matiere) requete.set("matiere", matiere)
  if (niveau) requete.set("niveau", niveau)

  let reponse: Reponse | null = null
  try {
    reponse = await api<Reponse>(`/v1/repetiteurs?${requete.toString()}`, {
      sansSession: true,
    })
  } catch {
    reponse = null
  }

  const referentiel = await lireReferentiel()

  /** Une adresse identique, un filtre en plus ou en moins. */
  const avec = (cle: "matiere" | "niveau", valeur: string | null) => {
    const p = new URLSearchParams()
    const courant = { matiere, niveau }
    for (const [k, v] of Object.entries(courant)) {
      if (v) p.set(k, v)
    }
    if (valeur === null) p.delete(cle)
    else p.set(cle, valeur)
    p.delete("page")
    const q = p.toString()
    return chemin(langue, `/annuaire${q ? `?${q}` : ""}`)
  }

  const actifs = [matiere, niveau].filter(Boolean).length

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col p-0">
      <header className="flex items-baseline justify-between px-3 pt-6">
        <div>
          <p className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.etiquette}
          </p>
          <h1 className="mt-1 text-[22px] font-medium tracking-[-0.02em]">
            {t.titre}
          </h1>
          {reponse ? (
            <p className="doux mt-1 text-[12.5px]">
              {pluriel(langue, reponse.pagination.total, t.controles)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ReglagesRapides />
          <Link
            href={chemin(langue, "/parent")}
            className="doux text-sm underline underline-offset-4"
          >
            {t.retour}
          </Link>
        </div>
      </header>

      {/* La bande de filtres.

          Elle défile horizontalement — c'est le seul endroit de
          l'application où cela est voulu : une bande de pastilles se lit
          comme telle, et tronquer la liste cacherait des matières. La page,
          elle, ne défile jamais de côté. */}
      <div
        className="relative mt-3.5 overflow-x-auto pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex w-max gap-1.5 px-3">
          <Link
            href={chemin(langue, "/annuaire")}
            className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
            style={
              actifs > 0
                ? {
                    borderColor: "var(--voyant)",
                    background: "var(--voyant)",
                    color: "#fff",
                  }
                : { borderColor: "var(--bordure)" }
            }
          >
            {actifs > 0 ? `${t.filtres} · ${actifs}` : t.tousLesFiltres}
          </Link>

          {referentiel.matieres.map((m) => (
            <Link
              key={`m-${m}`}
              href={avec("matiere", matiere === m ? null : m)}
              className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
              style={{
                borderColor: matiere === m ? "var(--accent)" : "var(--bordure)",
                background:
                  matiere === m
                    ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                    : "transparent",
              }}
            >
              {m}
            </Link>
          ))}

          {referentiel.niveaux.map((n) => (
            <Link
              key={`n-${n}`}
              href={avec("niveau", niveau === n ? null : n)}
              className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
              style={{
                borderColor: niveau === n ? "var(--accent)" : "var(--bordure)",
                background:
                  niveau === n
                    ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                    : "transparent",
              }}
            >
              {n}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-3">
        {reponse === null ? (
          <p className="doux text-sm leading-relaxed">{t.muet}</p>
        ) : reponse.donnees.length === 0 ? (
          <p className="doux text-sm leading-relaxed">
            {actifs > 0 ? t.aucun : t.aucunDuTout}
          </p>
        ) : (
          reponse.donnees.map((r) => (
            <Link
              key={r.id}
              href={chemin(langue, `/annuaire/${r.id}`)}
              className="block transition hover:opacity-90"
            >
              <Fiche r={r} langue={langue} d={d} />
            </Link>
          ))
        )}
      </div>

      {/* La frontière, dite plutôt que cachée derrière un bouton qui ne
          ferait rien. */}
      <section className="carte mx-3 mb-8 mt-4 p-5">
        <div className="text-[14px] font-medium">{t.suiteTitre}</div>
        <p className="doux mt-1 text-[12px] leading-relaxed">{t.suiteDetail}</p>
      </section>
    </main>
  )
}
