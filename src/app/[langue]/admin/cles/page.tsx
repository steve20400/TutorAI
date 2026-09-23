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
const ORDRE = ["carte_style", "carte_cle", "anthropic", "orange", "mtn"]

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

  const cles = ((data ?? []) as Cle[]).sort(
    (a, b) => ORDRE.indexOf(a.nom) - ORDRE.indexOf(b.nom),
  )

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={d.adminNav.cles} />

      <div className="max-w-2xl px-5 pb-7 sm:px-7">
        <p className="doux text-[13px] leading-relaxed">{t.intro}</p>

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
