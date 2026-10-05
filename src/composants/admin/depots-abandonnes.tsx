import { BoutonAction } from "@/composants/bouton-action"
import { purgerDepotsAbandonnes } from "@/actions/admin"
import { pluriel, remplir, type Dictionnaire, type Langue } from "@/langues"
import { api } from "@/lib/api"

/**
 * Les pièces laissées par des inscriptions jamais terminées.
 *
 * Quelqu'un photographie sa carte d'identité, le réseau coupe, ou il renonce
 * avant de valider — et ses documents restent dans le seau, rattachés à
 * personne. Garder des pièces d'identité d'inconnus, sans dossier ni
 * consentement, est exactement ce que cette plateforme promet de ne pas faire.
 *
 * Elle ne s'affiche que s'il y a quelque chose à effacer. Une carte « rien à
 * faire » posée en permanence dans un espace de travail finit par ne plus se
 * lire, et le jour où elle dit quelque chose, personne ne la voit.
 *
 * Le nombre d'abord, le bouton ensuite : un bouton qui ne dit pas ce qu'il
 * emporte n'est pas un bouton, c'est un pari. Et le délai de grâce de
 * vingt-quatre heures est écrit, parce qu'il explique pourquoi un dépôt de ce
 * matin n'y figure pas.
 *
 * Elle se lit elle-même plutôt que de recevoir ses données : les deux écrans
 * qui la portent ont des chemins différents, et l'un d'eux rend tôt quand la
 * pile est vide — la faire descendre depuis chacun voulait dire l'oublier
 * dans celui-là.
 */
export async function DepotsAbandonnes({
  langue,
  d,
}: {
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.adminPages.dossiers.depots

  let compte: { fichiers: number; depots: number } | null = null
  try {
    compte = await api<{ fichiers: number; depots: number }>(
      "/v1/admin/depots-abandonnes",
    )
  } catch {
    // Service muet : l'écran se passe de cette carte plutôt que de tomber.
    compte = null
  }

  if (!compte || compte.fichiers === 0) return null

  return (
    <section
      className="mt-7 rounded-[10px] border p-4"
      style={{ borderColor: "var(--voyant)", background: "var(--surface)" }}
    >
      <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
        {t.titre}
      </div>

      <p className="mt-1.5 text-[13px] font-medium">
        {remplir(t.compte, {
          fichiers: pluriel(langue, compte.fichiers, t.fichiers),
          depots: pluriel(langue, compte.depots, t.inscriptions),
        })}
      </p>

      <p className="doux mt-1 max-w-prose text-[12px] leading-relaxed">
        {t.detail}
      </p>

      <form action={purgerDepotsAbandonnes} className="mt-3">
        <input type="hidden" name="langue" value={langue} />
        <BoutonAction
          className="bt2 px-3 py-1.5 text-[12.5px]"
          style={{
            color: "var(--erreur-texte)",
            borderColor: "var(--erreur-texte)",
          }}
        >
          {t.purger}
        </BoutonAction>
      </form>
    </section>
  )
}
