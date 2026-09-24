import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import {
  chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

const COULEUR_ACTION: Record<string, string> = {
  verification: "var(--accent-doux-texte)",
  refus: "var(--erreur-texte)",
  activation: "var(--accent)",
  desactivation: "var(--texte-doux)",
}

type Personne = {
  id: string
  prenom: string | null
  nom: string | null
  identifiant: string | null
  role: string
}

/** Le nom qu'on affiche : prénom et nom, ou l'identifiant à défaut. */
const nomDe = (p: Personne | null) =>
  p ? [p.prenom, p.nom].filter(Boolean).join(" ") || p.identifiant : null

type LigneRegistre = {
  id: number
  admin_id: string | null
  action: string
  auteur: Personne | null
  cible: Personne | null
  cible_type: string | null
  cible_id: string | null
  motif: string | null
  cree_le: string
}

export default async function PageRegistre({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.registre

  await exigerAdmin(langue)

  const { donnees: liste } = await api<{ donnees: LigneRegistre[] }>(
    "/v1/admin/registre?limite=80",
  )

  if (liste.length === 0) {
    return (
      <>
        <EnteteAdmin
        retourVers={chemin(langue, "/admin")} etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} detail={t.videDetail} />
      </>
    )
  }

  const quand = (iso: string) =>
    new Date(iso).toLocaleString(langue, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })

  const t2 = d.adminPages.actionsDuRegistre

  return (
    <>
      <EnteteAdmin
        retourVers={chemin(langue, "/admin")}
        etiquette={t.etiquette}
        titre={d.adminNav.registre}
      />

      <div className="relative px-5 sm:px-7 pb-7 pl-9 sm:pl-12">
        <span
          className="absolute bottom-8 left-[34px] top-1 w-px"
          style={{ background: "var(--bordure)" }}
        />
        {liste.map((l) => (
          <div key={l.id} className="relative pb-5">
            <span
              className="absolute -left-[17px] top-1.5 h-[9px] w-[9px] rounded-full"
              style={{
                background: COULEUR_ACTION[l.action] ?? "var(--texte-doux)",
              }}
            />
            <div className="doux font-mono text-[11px]">
              {quand(l.cree_le)}
            </div>
            {/* Une phrase, pas un code.

                Le registre rendait « verification — repetiteur
                a4a47918-bea7-… » : illisible, donc jamais lu. Et il ne disait
                pas QUI avait agi, ce qui est pourtant sa seule raison d'être.

                Une action inconnue tombe sur son propre code plutôt que de
                disparaître : mieux vaut une ligne imparfaite qu'un trou dans
                une trace. */}
            <div className="mt-0.5 text-[13px] leading-relaxed">
              <b>{nomDe(l.auteur) ?? t2.parLaPlateforme}</b>{" "}
              {(t2 as Record<string, string>)[l.action] ?? l.action}
              {l.cible ? (
                <>
                  {" "}
                  <b>{nomDe(l.cible)}</b>
                </>
              ) : l.cible_id ? (
                <span className="doux"> {t2.cibleAnonyme}</span>
              ) : null}
            </div>
            {l.motif ? (
              <p className="doux mt-1 text-[12px] italic">{l.motif}</p>
            ) : null}
          </div>
        ))}
      </div>
    </>
  )
}
