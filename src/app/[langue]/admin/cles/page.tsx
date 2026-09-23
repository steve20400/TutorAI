import { poserCle } from "@/actions/admin"
import { EnteteAdmin } from "@/composants/admin/entete"
import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT, type Langue } from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

type Cle = {
  nom: string
  publique: boolean
  apercu: string | null
  maj_le: string | null
}

/** Ordre d'affichage : la carte d'abord, elle est la seule déjà en service. */
const ORDRE = [
  "carte_style",
  "carte_cle",
  "anthropic",
  "gemini",
  "ia_compatible",
  "ia_compatible_url",
  "orange",
  "mtn",
]

type EtatTuteur = {
  joignable: boolean
  clePosee: boolean
  moduleAllume: boolean
  fournisseur: string
  modele: string
  pretARepondre: boolean
  pourquoi: string | null
}

export default async function PageCles({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.cles

  await exigerAdmin(langue)

  // Le service appelle `lister_cles`, qui ne renvoie jamais la colonne
  // `valeur` — pas même à l'administration. Une clé secrète lue dans un
  // navigateur d'administrateur est une clé lue par toutes les extensions
  // qu'il y a installées.
  const { donnees: data } = await api<{ donnees: Cle[] }>("/v1/admin/cles")

  // Trois choses doivent être vraies pour qu'un élève obtienne une réponse.
  // Quand l'une manque, il voit « le tuteur n'est pas disponible » — et sans
  // cet encart, personne ici ne saurait laquelle.
  let etat: EtatTuteur | null = null
  try {
    etat = await api<EtatTuteur>("/v1/admin/tuteur/etat")
  } catch {
    etat = null
  }

  const cles = ((data ?? []) as Cle[]).sort(
    (a, b) => ORDRE.indexOf(a.nom) - ORDRE.indexOf(b.nom),
  )

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={d.adminNav.cles} />

      <div className="max-w-2xl px-5 pb-7 sm:px-7">
        <p className="doux text-[13px] leading-relaxed">{t.intro}</p>

        {etat ? <EtatDuTuteur etat={etat} /> : null}

        <div className="mt-5 flex flex-col gap-3">
          {cles.map((c) => (
            <CarteCle key={c.nom} cle={c} langue={langue} d={d} />
          ))}
        </div>

        <p className="doux mt-5 text-[12px] leading-relaxed">
          {d.adminPages.modules.jamaisRelue}
        </p>
      </div>
    </>
  )
}

/**
 * L'état du tuteur, en trois lignes.
 *
 * On dit ce qui manque, jamais la clé. Une clé secrète lue dans un navigateur
 * d'administrateur est une clé lue par toutes les extensions qu'il y a
 * installées — c'est déjà la règle de `lister_cles`, et elle vaut ici aussi.
 */
function EtatDuTuteur({ etat }: { etat: EtatTuteur }) {
  const lignes: Array<[boolean, string]> = [
    [etat.joignable, "Le service joint la base avec son laissez-passer"],
    [etat.clePosee, `Une clé est posée pour « ${etat.fournisseur} »`],
    [etat.moduleAllume, "Le module du tuteur est allumé"],
  ]

  return (
    <div
      className="mt-5 rounded-[10px] px-4 py-3.5"
      style={{
        background: etat.pretARepondre
          ? "var(--accent-doux)"
          : "color-mix(in srgb, var(--texte) 5%, var(--fond))",
        color: etat.pretARepondre ? "var(--accent-doux-texte)" : "var(--texte)",
      }}
    >
      <p className="text-[13px] font-medium">
        {etat.pretARepondre
          ? "Le tuteur est en état de répondre."
          : "Le tuteur ne répondra pas encore."}
      </p>

      <ul className="mt-2.5 flex flex-col gap-1.5">
        {lignes.map(([bon, quoi]) => (
          <li key={quoi} className="flex items-start gap-2 text-[12.5px]">
            <span aria-hidden className="pt-px">
              {bon ? "\u2713" : "\u00b7"}
            </span>
            <span style={{ opacity: bon ? 1 : 0.65 }}>{quoi}</span>
          </li>
        ))}
      </ul>

      {etat.pourquoi ? (
        <p className="mt-2.5 text-[12px]" style={{ opacity: 0.75 }}>
          {etat.pourquoi}
        </p>
      ) : null}

      {etat.pretARepondre ? (
        <p className="mt-2.5 text-[12px]" style={{ opacity: 0.75 }}>
          Modèle servi aux comptes : {etat.modele}
        </p>
      ) : null}
    </div>
  )
}

function CarteCle({
  cle,
  langue,
  d,
}: {
  cle: Cle
  langue: Langue
  d: ReturnType<typeof dictionnaire>
}) {
  const t = d.adminPages.cles
  const libelle = (t as Record<string, unknown>)[cle.nom]
  const posee = Boolean(cle.apercu)

  return (
    <section className="carte p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-medium">
          {typeof libelle === "string" ? libelle : cle.nom}
        </span>
        <span className={posee ? "badge-actif" : "badge-eteint"}>
          {posee ? t.posee : d.adminPages.modules.nonRenseignee}
        </span>
      </div>

      {cle.nom === "carte_style" ? (
        <p className="doux mt-2 text-[12px] leading-relaxed">{t.carteDetail}</p>
      ) : null}

      {cle.publique ? (
        <p className="doux mt-2 text-[11.5px] leading-relaxed">{t.publique}</p>
      ) : null}

      {posee ? (
        <p className="doux mt-2 break-all font-mono text-[11.5px]">
          {cle.apercu}
        </p>
      ) : null}

      <form action={poserCle} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="langue" value={langue} />
        <input type="hidden" name="nom" value={cle.nom} />
        <input
          type={cle.publique ? "text" : "password"}
          name="valeur"
          autoComplete="off"
          spellCheck={false}
          placeholder={cle.nom === "carte_style" ? "https://…/style.json" : "—"}
          className="champ min-w-[200px] flex-1 px-3 py-2 text-[13px]"
        />
        <button type="submit" className="bt1">
          {t.enregistrer}
        </button>
      </form>
    </section>
  )
}
