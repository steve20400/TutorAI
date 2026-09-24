import Link from "next/link"
import { notFound } from "next/navigation"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import { lireParametres } from "@/lib/parametres"
import {
  basculerParametre,
  changerFournisseur,
  changerModeles,
  changerResolution,
} from "@/actions/admin"
import { MODULES, type CleModule } from "@/lib/modules"
import { BoutonAction } from "@/composants/bouton-action"

/**
 * Modules qui ne peuvent pas s'allumer sans qu'une clé soit enregistrée.
 * L'interrupteur reste grisé tant qu'elle manque — et l'action serveur refuse
 * aussi, parce qu'un bouton désactivé ne protège que l'interface.
 */
const CLE_REQUISE: Partial<Record<CleModule, string>> = {
  paiement_actif: "mobile_money",
}



const RESOLUTIONS = ["360p", "480p", "720p"] as const

export default async function PageModule({
  params,
}: {
  params: Promise<{ langue: string; cle: string }>
}) {
  const { langue: brut, cle: cleBrute } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.modules

  if (!(MODULES as readonly string[]).includes(cleBrute)) notFound()
  const cle = cleBrute as CleModule

  await exigerAdmin(langue)
  const parametres = await lireParametres()

  const actif = parametres[cle]
  const textes = d.admin.interrupteurs[cle]

  // Aucune clé n'est encore stockée : la table viendra avec le module de
  // paiement. En attendant, tout module qui en exige une reste bloqué — ce qui
  // est le comportement voulu, pas un manque.
  const cleManquante = CLE_REQUISE[cle] !== undefined

  // Pour le tuteur, la clé exigée suit le fournisseur choisi : exiger une clé
  // Anthropic alors que l'administration a basculé sur Gemini garderait
  // l'interrupteur grisé sans que personne comprenne pourquoi.
  const fournisseur =
    typeof parametres.ia_fournisseur === "string"
      ? parametres.ia_fournisseur
      : "anthropic"

  // La liste des fournisseurs n'est pas recopiée ici : elle vient du service,
  // qui la tient de ses propres adaptateurs. En ajouter un du côté du site
  // afficherait un bouton que rien ne sait servir.
  let fournisseursConnus: string[] = []
  if (cle === "ia_active") {
    try {
      const etat = await api<{ fournisseursConnus: string[] }>(
        "/v1/admin/tuteur/etat",
      )
      fournisseursConnus = etat.fournisseursConnus ?? []
    } catch {
      fournisseursConnus = []
    }
  }

  return (
    <>

      <EnteteAdmin
        retourVers={chemin(langue, "/admin/modules")} etiquette={d.admin.modules} titre={textes.titre}>
        <span className={actif ? "badge-verifie" : "badge-eteint"}>
          {actif ? t.enMarche : t.eteint}
        </span>
      </EnteteAdmin>

      <div className="flex max-w-2xl flex-col gap-5 px-5 sm:px-7 pb-7">
        <p className="doux text-[13px] leading-relaxed">{textes.detail}</p>

        {cle === "ia_active" && fournisseursConnus.length > 0 ? (
          <section className="carte p-5">
            <div className="text-[14px] font-medium">{t.fournisseurTitre}</div>
            <p className="doux mt-1 text-[12px] leading-relaxed">
              {t.fournisseurDetail}
            </p>
            <form action={changerFournisseur} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="langue" value={langue} />
              {fournisseursConnus.map((f) => (
                <BoutonAction
                  key={f}
                  nom="fournisseur"
                  valeur={f}
                  className={fournisseur === f ? "bt1" : "bt2"}
                >
                  {d.adminPages.cles[f as keyof typeof d.adminPages.cles] ?? f}
                </BoutonAction>
              ))}
            </form>

            {/* Le nom du modèle.

                Choisir un fournisseur en pose un de départ, mais il y a deux
                cas que personne ne peut deviner : un modèle qu'on héberge
                chez soi porte le nom qu'on lui a donné, et le catalogue d'un
                fournisseur bouge sans prévenir. Sans ce champ, il faudrait
                aller le changer en base — ce que cet espace existe
                précisément pour éviter. */}
            <form
              action={changerModeles}
              className="mt-5 border-t pt-4"
              style={{ borderColor: "var(--bordure)" }}
            >
              <input type="hidden" name="langue" value={langue} />
              <div className="text-[13px] font-medium">{t.modelesTitre}</div>
              <p className="doux mt-1 text-[12px] leading-relaxed">
                {t.modelesDetail}
              </p>

              <div className="mt-3 flex flex-col gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="doux text-[11.5px]">{t.modeleCompte}</span>
                  <input
                    name="modele_compte"
                    defaultValue={parametres.ia_modele_compte}
                    placeholder="—"
                    spellCheck={false}
                    autoComplete="off"
                    className="champ px-3 py-2 font-mono text-[12.5px]"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="doux text-[11.5px]">{t.modeleEssai}</span>
                  <input
                    name="modele_essai"
                    defaultValue={parametres.ia_modele_essai}
                    placeholder="—"
                    spellCheck={false}
                    autoComplete="off"
                    className="champ px-3 py-2 font-mono text-[12.5px]"
                  />
                </label>
              </div>

              <BoutonAction className="bt1 mt-3">
                {d.adminPages.cles.enregistrer}
              </BoutonAction>
            </form>
          </section>
        ) : null}

        {cle === "enregistrement_actif" ? (
          <section className="carte p-5">
            <div className="text-[14px] font-medium">{t.resolutionTitre}</div>
            <p className="doux mt-1 text-[12px] leading-relaxed">
              {d.admin.resolutionDetail}
            </p>
            <form action={changerResolution} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="langue" value={langue} />
              {RESOLUTIONS.map((r) => (
                <BoutonAction
                  key={r}
                  nom="resolution"
                  valeur={r}
                  className={parametres.resolution_video === r ? "bt1" : "bt2"}
                >
                  {r}
                </BoutonAction>
              ))}
            </form>
          </section>
        ) : null}

        {cleManquante ? (
          <section className="carte p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-medium">
                {t.cleAnthropique}
              </span>
              <span className="badge-eteint">{t.nonRenseignee}</span>
            </div>
            <p className="doux mt-2 text-[12px] leading-relaxed">
              {t.jamaisRelue}
            </p>
          </section>
        ) : null}

        <form
          action={basculerParametre}
          className="flex flex-wrap items-center gap-4 border-t pt-5"
          style={{ borderColor: "var(--bordure)" }}
        >
          <input type="hidden" name="langue" value={langue} />
          <input type="hidden" name="cle" value={cle} />
          <input type="hidden" name="valeur" value={String(!actif)} />

          <div className="min-w-[160px] flex-1">
            <div className="text-[13px] font-medium">
              {actif ? t.eteindre : t.allumer}
            </div>
            {cleManquante && !actif ? (
              <div className="doux mt-0.5 text-[12px]">
                {t.impossibleSansCle}
              </div>
            ) : null}
          </div>

          <BoutonAction
            desactive={cleManquante && !actif}
            className={actif ? "bt2" : "bt1"}
          >
            {actif ? d.admin.eteindre : d.admin.activer}
          </BoutonAction>
        </form>

        <p className="doux text-[12px] leading-relaxed">{d.admin.journal}</p>
      </div>
    </>
  )
}
