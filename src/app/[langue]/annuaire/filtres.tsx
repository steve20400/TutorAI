"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { francs } from "./fiche"
import { chemin, remplir, type Dictionnaire, type Langue } from "@/langues"

export type Etat = {
  ville?: string
  matiere?: string
  niveau?: string
  q?: string
  prixMin?: number
  prixMax?: number
  experienceMin?: number
  tri?: string
}

export type Ville = { ville: string; n: number }

/**
 * La barre de filtres du grand écran, reprise de `Main.dc.html`.
 *
 * Elle écrit dans l'adresse plutôt que dans un état : une recherche se
 * partage par un lien, le retour du navigateur défait un filtre au lieu de
 * quitter la page, et l'écran reste servi.
 *
 * Les chiffres des villes viennent de la base. Les afficher au jugé — « une
 * dizaine à Douala » — serait exactement le genre de donnée inventée que ce
 * projet refuse.
 *
 * Deux filtres du canevas manquent ici, et c'est volontaire : « disponibilité »
 * et « langue du cours » n'ont aucune colonne derrière eux. Le répétiteur
 * écrit ses disponibilités en texte libre, et la langue du cours n'existe pas
 * en base. Les dessiner quand même aurait donné des pastilles qui ne filtrent
 * rien.
 */
export function Filtres({
  etat,
  villes,
  matieres,
  niveaux,
  bornes,
  langue,
  d,
}: {
  etat: Etat
  villes: Ville[]
  matieres: string[]
  niveaux: string[]
  /** Le tarif le plus bas et le plus haut de l'annuaire, pour borner. */
  bornes: { min: number; max: number }
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.annuaire.rail
  const router = useRouter()

  const [enCours, demarrer] = useTransition()
  const [prixMin, setPrixMin] = useState(etat.prixMin ?? bornes.min)
  const [prixMax, setPrixMax] = useState(etat.prixMax ?? bornes.max)

  function aller(modif: Partial<Etat>) {
    const p = new URLSearchParams()
    const suivant = { ...etat, ...modif }
    for (const [k, v] of Object.entries(suivant)) {
      if (v !== undefined && v !== "" && v !== null) p.set(k, String(v))
    }
    const q = p.toString()
    // `replace` et non `push` : dix filtres essayés ne doivent pas obliger à
    // dix retours pour revenir à l'écran d'où l'on vient. Le bouton Retour
    // sort de l'annuaire, il ne rejoue pas les filtres un par un.
    demarrer(() => router.replace(chemin(langue, `/annuaire${q ? `?${q}` : ""}`)))
  }

  const total = villes.reduce((n, v) => n + v.n, 0)
  const actifs = Object.values(etat).filter(
    (v) => v !== undefined && v !== "",
  ).length

  return (
    <aside
      className="w-[238px] flex-shrink-0 transition-opacity"
      style={{ opacity: enCours ? 0.55 : 1 }}
      aria-busy={enCours}
    >
      <div className="mb-[11px] flex items-baseline justify-between">
        <span
          className="flex items-center gap-2 text-[11.5px] tracking-[0.12em]"
          style={{ color: "var(--texte-doux)" }}
        >
          {t.titre}
          {/* Le filtre a pris : sans ce cercle, on clique et rien ne bouge
              tant que le serveur n'a pas répondu — on croit avoir manqué la
              pastille et on reclique. */}
          {enCours ? <span aria-hidden className="cercle-attente" /> : null}
        </span>
        {actifs > 0 ? (
          <button
            type="button"
            onClick={() =>
              demarrer(() => router.replace(chemin(langue, "/annuaire")))
            }
            className="text-[12.5px]"
            style={{ color: "var(--voyant)" }}
          >
            {t.effacer}
          </button>
        ) : null}
      </div>

      <Titre>{t.ville}</Titre>
      {villes.map((v) => (
        <button
          key={v.ville}
          type="button"
          onClick={() => aller({ ville: etat.ville === v.ville ? undefined : v.ville })}
          className="flex w-full justify-between py-1.5 text-[13px]"
          style={{
            color:
              etat.ville === v.ville ? "var(--voyant)" : "var(--texte)",
          }}
        >
          <span>{v.ville}</span>
          <span>{v.n}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => aller({ ville: undefined })}
        className="doux flex w-full justify-between py-1.5 text-[13px]"
      >
        <span>{t.toutLePays}</span>
        <span>{total}</span>
      </button>

      <Espace />
      <Titre>{t.matiere}</Titre>
      <Pastilles
        valeurs={matieres}
        actif={etat.matiere}
        surChoix={(m) => aller({ matiere: m })}
      />

      <Espace />
      <Titre>{t.niveau}</Titre>
      <select
        value={etat.niveau ?? ""}
        onChange={(e) => aller({ niveau: e.target.value || undefined })}
        className="w-full rounded-[9px] px-3 py-2.5 text-[13px]"
        style={{
          background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
          color: "var(--texte)",
          border: "0",
        }}
      >
        <option value="">{t.tousNiveaux}</option>
        {niveaux.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      {/* La glissière n'a de sens que si les tarifs s'étalent. Quand tout
          l'annuaire est au même prix — ou qu'aucun tarif n'est renseigné —
          elle ne filtrerait rien, et une glissière qui ne bouge pas se lit
          comme une panne. Le reste de la barre, lui, s'affiche toujours. */}
      {bornes.max > bornes.min ? (
      <>
      <Espace />
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium">{t.prix}</span>
        <span className="text-[12.5px]" style={{ color: "var(--voyant)" }}>
          {francs(prixMin)} – {francs(prixMax)}
        </span>
      </div>
      <Glissiere
        min={bornes.min}
        max={bornes.max}
        bas={prixMin}
        haut={prixMax}
        surBas={setPrixMin}
        surHaut={setPrixMax}
        surFin={() => aller({ prixMin, prixMax })}
      />
      <div className="doux flex justify-between text-[11.5px]">
        <span>{francs(bornes.min)}</span>
        <span>{francs(bornes.max)}</span>
      </div>
      </>
      ) : null}

      <Espace />
      <Titre>{t.experience}</Titre>
      <Pastilles
        valeurs={[2, 5, 10].map((n) => remplir(t.ansEtPlus, { n }))}
        actif={
          etat.experienceMin
            ? remplir(t.ansEtPlus, { n: etat.experienceMin })
            : undefined
        }
        surChoix={(libelle) => {
          if (!libelle) {
            aller({ experienceMin: undefined })
            return
          }
          const n = Number(libelle.replace(/\D/g, ""))
          aller({ experienceMin: etat.experienceMin === n ? undefined : n })
        }}
      />
    </aside>
  )
}

function Titre({ children }: { children: React.ReactNode }) {
  return <p className="mb-[7px] text-[12.5px] font-medium">{children}</p>
}

function Espace() {
  return <div className="h-[18px]" />
}

function Pastilles({
  valeurs,
  actif,
  surChoix,
}: {
  valeurs: string[]
  actif?: string
  surChoix: (v: string | undefined) => void
}) {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {valeurs.map((v) => {
        const choisi = actif === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => surChoix(choisi ? undefined : v)}
            className="rounded-[20px] border px-[11px] py-[5px] text-[12.5px]"
            style={
              choisi
                ? {
                    borderColor: "var(--accent)",
                    background: "var(--accent)",
                    color: "var(--accent-texte)",
                  }
                : { borderColor: "var(--bordure)", color: "var(--texte)" }
            }
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}

/**
 * La glissière à deux poignées.
 *
 * Deux `input type=range` superposés sur une même piste : c'est la seule
 * façon d'obtenir deux poignées sans réécrire le glisser-déposer à la main,
 * et les deux restent des contrôles natifs — donc utilisables au clavier,
 * ce qu'un faux curseur en `div` ne serait pas.
 *
 * On ne navigue qu'au relâchement. Recharger la page à chaque pixel parcouru
 * enverrait cinquante requêtes pour un geste.
 */
function Glissiere({
  min,
  max,
  bas,
  haut,
  surBas,
  surHaut,
  surFin,
}: {
  min: number
  max: number
  bas: number
  haut: number
  surBas: (n: number) => void
  surHaut: (n: number) => void
  surFin: () => void
}) {
  const etendue = Math.max(1, max - min)
  const gauche = ((bas - min) / etendue) * 100
  const droite = 100 - ((haut - min) / etendue) * 100

  return (
    <div className="relative my-3.5 h-3.5">
      <div
        className="absolute left-0 right-0 top-1.5 h-[3px] rounded-sm"
        style={{ background: "var(--bordure)" }}
      />
      <div
        className="absolute top-1.5 h-[3px] rounded-sm"
        style={{
          left: `${gauche}%`,
          right: `${droite}%`,
          background: "var(--voyant)",
        }}
      />
      <input
        type="range"
        aria-label="min"
        min={min}
        max={max}
        step={500}
        value={bas}
        onChange={(e) => surBas(Math.min(Number(e.target.value), haut))}
        onMouseUp={surFin}
        onTouchEnd={surFin}
        onKeyUp={surFin}
        className="glissiere"
      />
      <input
        type="range"
        aria-label="max"
        min={min}
        max={max}
        step={500}
        value={haut}
        onChange={(e) => surHaut(Math.max(Number(e.target.value), bas))}
        onMouseUp={surFin}
        onTouchEnd={surFin}
        onKeyUp={surFin}
        className="glissiere"
      />
    </div>
  )
}

/**
 * Le tri, en tête de la colonne des fiches.
 *
 * Deux ordres seulement, et c'est une limite assumée : « le mieux noté »
 * n'existe pas, il n'y a pas de notes — et il n'y en aura pas tant qu'un
 * répétiteur pourra être coulé par trois avis d'un parent fâché.
 */
export function Tri({
  etat,
  langue,
  d,
}: {
  etat: Etat & { tri?: string }
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.annuaire.rail
  const router = useRouter()
  const [enCours, demarrer] = useTransition()

  function choisir(valeur: string) {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(etat)) {
      if (v !== undefined && v !== "" && k !== "tri") p.set(k, String(v))
    }
    if (valeur) p.set("tri", valeur)
    const q = p.toString()
    demarrer(() => router.replace(chemin(langue, `/annuaire${q ? `?${q}` : ""}`)))
  }

  return (
    <select
      disabled={enCours}
      value={etat.tri ?? "experience"}
      onChange={(e) => choisir(e.target.value)}
      aria-label={t.trier}
      className="shrink-0 border-0 bg-transparent text-[12.5px] lg:text-[13px]"
      style={{ color: "var(--texte-doux)" }}
    >
      <option value="experience">{t.trier}</option>
      <option value="tarif">{t.trierTarif}</option>
    </select>
  )
}

/**
 * La bande de pastilles du téléphone.
 *
 * Elle ne portait que les matières. Le grand écran a la ville, la matière, le
 * niveau, le prix et l'expérience ; n'en donner qu'une sur téléphone revient à
 * dire qu'un parent au téléphone cherche moins bien — alors que c'est
 * l'écran sur lequel il cherchera.
 *
 * Le prix reste au grand écran, et c'est le seul qui n'y est pas : une
 * glissière à deux poignées dans une bande qui défile de côté ne se tient
 * pas sous le pouce. Les quatre autres y sont.
 *
 * Elle défile horizontalement — le seul endroit de l'application où c'est
 * voulu. Une bande se lit comme telle, et tronquer la liste cacherait des
 * matières. La page, elle, ne défile jamais de côté.
 */
export function BandePastilles({
  etat,
  villes,
  matieres,
  niveaux,
  langue,
  d,
}: {
  etat: Etat
  villes: Ville[]
  matieres: string[]
  niveaux: string[]
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.annuaire
  const router = useRouter()
  const [enCours, demarrer] = useTransition()

  function aller(modif: Partial<Etat>) {
    const p = new URLSearchParams()
    const suivant = { ...etat, ...modif }
    for (const [k, v] of Object.entries(suivant)) {
      if (v !== undefined && v !== "" && v !== null) p.set(k, String(v))
    }
    const q = p.toString()
    demarrer(() => router.replace(chemin(langue, `/annuaire${q ? `?${q}` : ""}`)))
  }

  const actifs = Object.values(etat).filter(
    (v) => v !== undefined && v !== "",
  ).length

  const pastille = (
    cle: string,
    libelle: string,
    choisi: boolean,
    surClic: () => void,
  ) => (
    <button
      key={cle}
      type="button"
      onClick={surClic}
      className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
      style={{
        borderColor: choisi ? "var(--accent)" : "var(--bordure)",
        background: choisi
          ? "color-mix(in srgb, var(--accent) 12%, transparent)"
          : "transparent",
      }}
    >
      {libelle}
    </button>
  )

  return (
    <div
      className="-mx-3 mb-3 overflow-x-auto px-3 pb-1 transition-opacity lg:hidden"
      style={{ scrollbarWidth: "none", opacity: enCours ? 0.55 : 1 }}
      aria-busy={enCours}
    >
      <div className="flex w-max items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            demarrer(() => router.replace(chemin(langue, "/annuaire")))
          }
          className="flex items-center gap-1.5 whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
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
          {enCours ? <span aria-hidden className="cercle-attente" /> : null}
        </button>

        {villes.map((v) =>
          pastille(`v-${v.ville}`, v.ville, etat.ville === v.ville, () =>
            aller({ ville: etat.ville === v.ville ? undefined : v.ville }),
          ),
        )}

        {matieres.map((m) =>
          pastille(`m-${m}`, m, etat.matiere === m, () =>
            aller({ matiere: etat.matiere === m ? undefined : m }),
          ),
        )}

        {niveaux.map((n) =>
          pastille(`n-${n}`, n, etat.niveau === n, () =>
            aller({ niveau: etat.niveau === n ? undefined : n }),
          ),
        )}

        {[2, 5, 10].map((n) =>
          pastille(
            `x-${n}`,
            remplir(t.rail.ansEtPlus, { n }),
            etat.experienceMin === n,
            () => aller({ experienceMin: etat.experienceMin === n ? undefined : n }),
          ),
        )}
      </div>
    </div>
  )
}
