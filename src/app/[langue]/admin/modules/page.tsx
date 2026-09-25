import Link from "next/link"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { lireParametres } from "@/lib/parametres"
import { MODULES } from "@/lib/modules"
import { changerDuree, changerDelaiRattachement } from "@/actions/admin"
import { BoutonAction } from "@/composants/bouton-action"

export default async function PageModules({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.modules

  await exigerAdmin(langue)
  const parametres = await lireParametres()

  return (
    <>
      <EnteteAdmin
        retourVers={chemin(langue, "/admin")} etiquette={t.etiquette} titre={d.admin.modules} />

      <div className="px-5 sm:px-7 pb-7">
        {MODULES.map((cle) => {
          const actif = parametres[cle]
          const textes = d.admin.interrupteurs[cle]
          return (
            <Link
              key={cle}
              href={chemin(langue, `/admin/modules/${cle}`)}
              className="flex items-center gap-4 border-b py-4 transition hover:opacity-80"
              style={{ borderColor: "var(--bordure)" }}
            >
              {/* Le liseré dit l'état avant même qu'on lise la ligne. */}
              <span
                className="h-[30px] w-[3px] shrink-0 rounded-full"
                style={{
                  background: actif
                    ? "var(--accent-doux-texte)"
                    : "var(--bordure)",
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {textes.titre}
                </span>
                <span className="doux mt-0.5 block truncate text-[12px]">
                  {textes.detail}
                </span>
              </span>
              <span
                className="shrink-0 text-[11px] font-bold tracking-[0.09em]"
                style={{
                  color: actif
                    ? "var(--accent-doux-texte)"
                    : "var(--texte-doux)",
                }}
              >
                {actif ? t.enMarche : t.eteint}
              </span>
              <span className="doux shrink-0 text-[16px]">›</span>
            </Link>
          )
        })}
      </div>

      {/* Les réglages qui ne sont pas des interrupteurs.

          Ils n'avaient nulle part où vivre : la page des modules ne montrait
          que ce qui s'allume et s'éteint, et une durée n'est ni l'un ni
          l'autre. */}
      <div className="max-w-2xl px-5 pb-7 sm:px-7">
        <section className="carte p-5">
          <div className="text-[14px] font-medium">{t.dureeTitre}</div>
          <p className="doux mt-1 text-[12px] leading-relaxed">
            {t.dureeDetail}
          </p>

          <form action={changerDuree} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="langue" value={langue} />
            <input
              name="minutes"
              type="number"
              min={1}
              max={1440}
              defaultValue={parametres.duree_demande_mot_de_passe_minutes}
              className="champ w-28 px-3 py-2 text-[14px]"
            />
            <BoutonAction className="bt1 px-4 py-2">
              {d.adminPages.cles.enregistrer}
            </BoutonAction>
          </form>

          {/* Ce qui ne dépend pas de ce champ, et qu'il faut dire ici plutôt
              que de le laisser découvrir. */}
          <p
            className="doux mt-3 rounded-[8px] px-3 py-2 text-[11.5px] leading-relaxed"
            style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
          >
            {t.dureeCourriel}
          </p>
        </section>

        {/* Les quarante-huit heures de rattachement vivaient en dur dans une
            migration. Elles sont ici maintenant, et à zéro. */}
        <section className="carte mt-4 p-5">
          <div className="text-[14px] font-medium">{t.delaiTitre}</div>
          <p className="doux mt-1 text-[12px] leading-relaxed">
            {t.delaiDetail}
          </p>

          <form
            action={changerDelaiRattachement}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="langue" value={langue} />
            <input
              name="heures"
              type="number"
              min={0}
              max={168}
              defaultValue={parametres.delai_rattachement_heures ?? 0}
              className="champ w-28 px-3 py-2 text-[14px]"
            />
            <span className="doux text-[12px]">{t.delaiHeures}</span>
            <BoutonAction className="bt1 px-4 py-2">
              {d.adminPages.cles.enregistrer}
            </BoutonAction>
          </form>
        </section>
      </div>
    </>
  )
}
