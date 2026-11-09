import { notFound } from "next/navigation"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { remplir } from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import { lireParametres } from "@/lib/parametres"
import {
  basculerParametre,
  changerFournisseur,
  changerModeles,
  changerDebit,
  changerModeEnregistrement,
  changerResolution,
} from "@/actions/admin"
import { MODULES, type CleModule } from "@/lib/modules"
import { BoutonAction } from "@/composants/bouton-action"
import {
  DEBITS_AUDIO,
  DEBITS_VIDEO,
  enTaille,
  minimumPour,
  MODES,
  montantRequis,
  poidsParHeure,
  RESOLUTIONS,
  resolutionTenable,
} from "@/lib/enregistrement"

/**
 * Modules qui ne peuvent pas s'allumer sans qu'une clé soit enregistrée.
 * L'interrupteur reste grisé tant qu'elle manque — et l'action serveur refuse
 * aussi, parce qu'un bouton désactivé ne protège que l'interface.
 */
const CLE_REQUISE: Partial<Record<CleModule, string>> = {
  paiement_actif: "mobile_money",
}




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
            <div className="text-[14px] font-medium">{t.captureTitre}</div>

            {/* Ce qui existe, et ce qui n'existe pas. Dit AVANT les boutons.

                `enregistrement_url` avait une colonne prête, une lecture
                prête, et personne pour dire que rien n'écrivait — on a cru
                pendant des mois que les séances étaient enregistrées. Un
                réglage qui commande une capture absente referait exactement
                la même chose, en pire : cette fois quelqu'un l'aurait
                choisie. */}
            <p className="doux mt-1 text-[12px] leading-relaxed">
              {d.admin.captureDetail}
            </p>

            <form action={changerModeEnregistrement} className="mt-4 flex flex-col gap-2">
              <input type="hidden" name="langue" value={langue} />
              {MODES.map((m) => {
                const choisi = parametres.mode_enregistrement === m
                const mo = poidsParHeure(
                  m,
                  parametres.debit_audio,
                  parametres.debit_video,
                )
                const montant = montantRequis(
                  m,
                  parametres.debit_audio,
                  parametres.debit_video,
                )
                return (
                  <BoutonAction
                    key={m}
                    nom="mode"
                    valeur={m}
                    className={`${choisi ? "bt1" : "bt2"} justify-between text-left`}
                  >
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="text-[13px]">{d.admin.modes[m].titre}</span>
                      <span className="text-[11px] opacity-70">
                        {d.admin.modes[m].detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] opacity-80">
                      <span className="block">
                        {remplir(t.parHeure, { taille: enTaille(mo, langue) })}
                      </span>
                      <span className="block">
                        {montant === 0
                          ? d.admin.sansMontant
                          : remplir(d.admin.montantExige, {
                              debit: String(montant),
                            })}
                      </span>
                    </span>
                  </BoutonAction>
                )
              })}
            </form>

            {/* Le son et l'image ne se règlent que si on les capte. Afficher
                un curseur de débit vidéo quand on n'enregistre que le cahier,
                c'est inviter à régler une chose sans effet. */}
            {parametres.mode_enregistrement !== "cahier" ? (
              <>
                <div className="mt-5 text-[13px] font-medium">{t.debitAudioTitre}</div>
                <p className="doux mt-1 text-[12px] leading-relaxed">
                  {d.admin.debitAudioDetail}
                </p>
                <form action={changerDebit} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="langue" value={langue} />
                  <input type="hidden" name="quoi" value="audio" />
                  {DEBITS_AUDIO.map((kb) => (
                    <BoutonAction
                      key={kb}
                      nom="debit"
                      valeur={String(kb)}
                      className={parametres.debit_audio === kb ? "bt1" : "bt2"}
                    >
                      {remplir(t.kbits, { debit: String(kb) })}
                    </BoutonAction>
                  ))}
                </form>
              </>
            ) : null}

            {parametres.mode_enregistrement === "video" ? (
              <>
                <div className="mt-5 text-[13px] font-medium">{t.debitVideoTitre}</div>
                <p className="doux mt-1 text-[12px] leading-relaxed">
                  {d.admin.debitVideoDetail}
                </p>
                <form action={changerDebit} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="langue" value={langue} />
                  <input type="hidden" name="quoi" value="video" />
                  {DEBITS_VIDEO.map((kb) => (
                    <BoutonAction
                      key={kb}
                      nom="debit"
                      valeur={String(kb)}
                      className={parametres.debit_video === kb ? "bt1" : "bt2"}
                    >
                      {remplir(t.kbits, { debit: String(kb) })}
                    </BoutonAction>
                  ))}
                </form>

                <div className="mt-5 text-[13px] font-medium">{t.resolutionTitre}</div>
                <p className="doux mt-1 text-[12px] leading-relaxed">
                  {d.admin.resolutionDetail}
                </p>
                <form action={changerResolution} className="mt-2 flex flex-wrap gap-2">
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

                {/* Filmer en 720p à 150 kbit/s donne une bouillie où l'on ne
                    reconnaît pas un visage : un enregistrement de sécurité
                    qui ne sécurise rien, au prix du réseau quand même. On le
                    dit plutôt que de laisser faire. */}
                {!resolutionTenable(
                  parametres.resolution_video,
                  parametres.debit_video,
                ) ? (
                  <p
                    className="mt-3 rounded-[10px] px-3 py-2.5 text-[12px] leading-relaxed"
                    style={{
                      background:
                        "color-mix(in srgb, var(--erreur-texte) 10%, transparent)",
                      color: "var(--erreur-texte)",
                    }}
                  >
                    {remplir(d.admin.resolutionIntenable, {
                      resolution: parametres.resolution_video,
                      minimum: String(minimumPour(parametres.resolution_video)),
                    })}
                  </p>
                ) : null}
              </>
            ) : null}
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
