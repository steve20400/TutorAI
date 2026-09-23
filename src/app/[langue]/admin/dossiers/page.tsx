import Link from "next/link"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

/** Décalages de la pile. Au-delà, l'œil ne distingue plus les épaisseurs. */
const EPAISSEURS = [
  { x: 26, y: 22, r: 4.4 },
  { x: 21, y: 18, r: -3.5 },
  { x: 16, y: 13, r: 2.6 },
  { x: 10, y: 8, r: -1.7 },
  { x: 5, y: 4, r: 0.9 },
]

/** `maj_le` peut être nul sur une fiche jamais modifiée : on retombe alors
 *  sur sa date de création, jamais sur « aujourd'hui » — un dossier déposé il
 *  y a trois semaines ne doit pas se présenter comme arrivé ce matin. */
function joursDepuis(date: string | null, repli: string): number {
  const ms = Date.now() - new Date(date ?? repli).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

/** Ce que le service renvoie pour une fiche, identité comprise. */
type Dossier = {
  id: string
  ville: string | null
  matieres: string[] | null
  niveaux: string[] | null
  annees_experience: number | null
  tarif_mensuel: number | null
  statut: string
  cree_le: string
  maj_le: string | null
  profil: {
    prenom: string | null
    nom: string | null
    identifiant: string | null
    desactive_le: string | null
  } | null
}

export default async function PageDossiers({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.dossiers

  await exigerAdmin(langue)

  const { donnees: liste } = await api<{ donnees: Dossier[] }>(
    "/v1/admin/dossiers?statut=en_attente",
  )
  const premier = liste[0]

  if (!premier) {
    return (
      <>
        <EnteteAdmin etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} detail={t.videDetail} />
      </>
    )
  }


  // L'identité arrive avec la fiche : plus de second appel à rapprocher.
  const nomDe = (d: Dossier) =>
    [d.profil?.prenom, d.profil?.nom].filter(Boolean).join(" ") || "—"

  const jours = joursDepuis(premier.maj_le, premier.cree_le)
  const restants = liste.slice(1)

  return (
    <>
      <EnteteAdmin
        etiquette={t.etiquette}
        titre={
          liste.length === 1
            ? t.titre.one
            : remplir(t.titre.other, { n: liste.length })
        }
      />

      <div className="px-5 sm:px-7 pb-7">
        {/* La pile : cinq épaisseurs derrière, jamais plus. */}
        <div className="relative" style={{ height: 156 }}>
          {EPAISSEURS.slice(0, Math.min(5, restants.length)).map((e, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: e.x,
                top: e.y,
                width: "min(420px, 78%)",
                height: 118,
                borderRadius: "3px 10px 10px 10px",
                background: "var(--surface)",
                border: "1px solid var(--bordure)",
                opacity: 0.55 - i * 0.07,
                transform: `rotate(${e.r}deg)`,
              }}
            />
          ))}

          <article
            className="dossier absolute p-5"
            style={{ left: 0, top: 0, width: "min(430px, 80%)" }}
          >
            <span
              className="dossier-langue"
              style={{ background: "var(--voyant)" }}
            />
            <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
              {premier.ville ?? "—"} ·{" "}
              {jours === 0
                ? t.deposeAujourdhui
                : remplir(t.depose, { jours })}
            </div>
            <h2 className="mt-2 text-[17px] font-semibold">
              {nomDe(premier)}
            </h2>
            <p className="doux mt-1 truncate text-[12.5px]">
              {(premier.niveaux ?? [])
                .map((n: string) => d.niveaux[n] ?? n)
                .join(", ")}
              {" · "}
              {(premier.matieres ?? [])
                .map((m: string) => d.matieres[m] ?? m)
                .join(", ")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={chemin(langue, `/admin/dossiers/${premier.id}`)}
                className="bt1"
              >
                {t.ouvrirPieces}
              </Link>
            </div>
          </article>
        </div>

        {restants.length > 0 ? (
          <section
            className="mt-8 border-t pt-4"
            style={{ borderColor: "var(--bordure)" }}
          >
            <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
              {t.sousLaPile}
            </div>
            {/* Toute la pile, et non les six premiers. Le plafond précédent
                n'était pas seulement une troncature d'affichage : les dossiers
                au-delà du sixième n'étaient accessibles par aucun chemin, et
                « et 14 autres » ne menait nulle part. Un dossier qu'on ne peut
                pas ouvrir est un répétiteur qui attend indéfiniment. */}
            <div className="mt-2 max-h-[46vh] overflow-y-auto">
              {restants.map((r) => (
                <Link
                  key={r.id}
                  href={chemin(langue, `/admin/dossiers/${r.id}`)}
                  className="flex items-center gap-4 border-t py-2.5 text-[13px] transition hover:opacity-70"
                  style={{ borderColor: "var(--bordure)" }}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {nomDe(r)}
                  </span>
                  <span className="doux shrink-0">{r.ville ?? "—"}</span>
                </Link>
              ))}
            </div>

          </section>
        ) : null}
      </div>
    </>
  )
}
