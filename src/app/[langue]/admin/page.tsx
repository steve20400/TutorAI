import Link from "next/link"

import { CarteCouverture } from "@/composants/admin/carte"
import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import { lireParametres } from "@/lib/parametres"

export default async function TableauDeBord({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.tableauDeBord

  await exigerAdmin(langue)
  const parametres = await lireParametres()

  // Tout l'écran en un appel : six requêtes séparées voudraient dire six
  // allers-retours vers un service qui peut dormir cinquante secondes.
  const tb = await api<{
    aVerifier: number
    familles: number
    seancesEnCours: number
    villes: { nom: string; lon: number | null; lat: number | null }[]
    comptes: Record<string, number>
    styleCarte: string
  }>("/v1/admin/tableau-de-bord")

  const aVerifier = tb.aVerifier
  const nbFamilles = tb.familles
  const nbEnCours = tb.seancesEnCours
  const ouvertes = tb.villes
  const comptes = tb.comptes
  const styleCarte = tb.styleCarte

  // Classement des villes ouvertes, les mieux pourvues d'abord. Les villes à
  // zéro restent dans la liste, en bas : ce sont elles qui appellent une
  // décision.
  const classement = ouvertes
    .map((v) => [v.nom, comptes[v.nom] ?? 0] as const)
    .sort((a, b) => b[1] - a[1])
  const sommet = Math.max(1, ...classement.map(([, n]) => n))

  // Le titre dit ce que la page raconte aujourd'hui, pas le nom de la rubrique.
  //
  // La ville nommée est une ville RÉELLEMENT ouverte et réellement vide. Tant
  // qu'aucune ville n'est ouverte, annoncer qu'il en manque dans l'une d'elles
  // serait une phrase inventée : la carte n'aurait rien à montrer.
  const vides = ouvertes.filter((v) => !comptes[v.nom])
  const titre =
    ouvertes.length === 0 || Object.keys(comptes).length === 0
      ? t.titreVide
      : vides.length > 0
        ? remplir(t.titreCouverture, { ville: vides[0]!.nom })
        : t.titreCalme

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={titre} />

      {/* Sous le point de rupture la carte passe en dernier : elle a besoin de
          toute la largeur, et les chiffres qui appellent une action doivent
          rester au-dessus de la ligne de flottaison. */}
      <div className="flex flex-col gap-4 px-5 pb-7 sm:px-7 lg:grid lg:grid-cols-[1.45fr_1fr] lg:items-start">
        <section className="carte order-last flex flex-col gap-3 p-4 sm:p-5 lg:order-first">
          <div className="min-h-[260px] flex-1 sm:min-h-[340px]">
            <CarteCouverture
              villes={ouvertes}
              comptes={comptes}
              styleUrl={styleCarte}
              legendeVide={t.aucuneVille}
              etiquetteCarte={t.couverture}
            />
          </div>

          <p className="doux text-[12px] leading-relaxed">
            {nbFamilles} {pluriel(langue, nbFamilles, t.familles)}
          </p>
        </section>

        <div className="flex flex-col gap-4">
          <section className="carte p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-[38px] font-light leading-none tracking-[-0.04em]">
                {aVerifier}
              </span>
              <span className="text-[14px] leading-snug">
                {pluriel(langue, aVerifier, t.dossiersAttendent)}
              </span>
            </div>
            {aVerifier > 0 ? (
              <Link
                href={chemin(langue, "/admin/dossiers")}
                className="bt1 mt-4 w-full"
              >
                {t.ouvrirLePremier}
              </Link>
            ) : null}
          </section>

          <section className="carte p-5">
            <div className="flex items-center gap-2.5">
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{
                  background: nbEnCours > 0 ? "var(--voyant)" : "var(--bordure)",
                }}
              />
              <span className="text-[14px]">
                <b>{nbEnCours}</b>{" "}
                {pluriel(langue, nbEnCours, t.seancesEnDirect)}
              </span>
            </div>
            <p className="doux mt-1.5 text-[12px]">
              {parametres.enregistrement_actif
                ? remplir(t.enregistrementActif, {
                    resolution: parametres.resolution_video,
                  })
                : t.enregistrementEteint}
            </p>
          </section>

          {/* Les barres restent à côté de la carte, elles ne la doublent pas :
              la carte dit OÙ, cette liste dit COMBIEN et dans quel ordre. Une
              ville à zéro garde sa ligne, rail vide — c'est elle qu'on cherche. */}
          {ouvertes.length > 0 ? (
            <section className="carte p-5">
              <div className="doux text-[11px] font-semibold uppercase tracking-[0.16em]">
                {t.couverture}
              </div>

              <div className="mt-3 flex flex-col gap-2.5">
                {classement.map(([ville, n]) => (
                  <div key={ville}>
                    <div className="flex items-baseline justify-between text-[12.5px]">
                      <span className={n === 0 ? "doux" : "font-medium"}>
                        {ville}
                      </span>
                      <span className="doux font-mono text-[11.5px]">{n}</span>
                    </div>
                    <div
                      className="mt-1 h-[3px] overflow-hidden rounded-full"
                      style={{ background: "var(--bordure)" }}
                    >
                      <i
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.round((n / sommet) * 100)}%`,
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

    </>
  )
}
