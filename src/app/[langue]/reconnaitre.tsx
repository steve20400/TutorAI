import { Avatar } from "@/composants/avatar"
import { remplir, type Langue, dictionnaire } from "@/langues"
import { repondreAuRattachement } from "@/actions/liens"

export type DemandeARecconnaitre = {
  id: string
  prenom: string | null
  nom: string | null
  photo_url: string | null
}

/**
 * « Cette personne dit être ton parent. Tu la reconnais ? »
 *
 * L'enfant ne donne rien, il reconnaît — c'est la seule chose qu'un enfant
 * fasse mieux qu'un adulte. On lui montre donc un prénom et un visage, et
 * rien d'autre : ni adresse ni téléphone. Cet écran ne doit pas devenir un
 * moyen d'apprendre comment joindre un adulte hors de la plateforme.
 *
 * Le refus est dit franchement comme sans conséquence, parce qu'il l'est : la
 * demande reste « en attente » du côté de l'adulte, pour toujours. Un enfant
 * qui craint de vexer quelqu'un doit savoir qu'il ne vexera personne.
 *
 * Placé en tête de son accueil plutôt qu'en écran forcé : on ne piège pas un
 * enfant dans une page dont il ne peut pas sortir. Mais il ne peut pas le
 * manquer.
 */
export function Reconnaitre({
  demandes,
  langue,
}: {
  demandes: DemandeARecconnaitre[]
  langue: Langue
}) {
  if (demandes.length === 0) return null
  const d = dictionnaire(langue)
  const t = d.reconnaitre

  return (
    <section className="flex flex-col gap-3">
      {demandes.map((demande) => {
        const nomComplet = [demande.prenom, demande.nom]
          .filter(Boolean)
          .join(" ")

        return (
          <div
            key={demande.id}
            className="carte flex flex-col gap-3 p-5"
            style={{ borderColor: "var(--accent)" }}
          >
            <div className="flex items-center gap-3">
              <Avatar
                nom={demande.prenom ?? "?"}
                photoUrl={demande.photo_url}
                taille={48}
              />
              <div className="min-w-0">
                <div className="font-medium">
                  {remplir(t.question, { nom: nomComplet })}
                </div>
                <p className="doux mt-0.5 text-[13px] leading-relaxed">
                  {t.aide}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <form action={repondreAuRattachement}>
                <input type="hidden" name="langue" value={langue} />
                <input type="hidden" name="demande" value={demande.id} />
                <input type="hidden" name="oui" value="1" />
                <button type="submit" className="bt1 px-4 py-2">
                  {t.oui}
                </button>
              </form>

              <form action={repondreAuRattachement}>
                <input type="hidden" name="langue" value={langue} />
                <input type="hidden" name="demande" value={demande.id} />
                <input type="hidden" name="oui" value="0" />
                <button type="submit" className="bt2 px-4 py-2">
                  {t.non}
                </button>
              </form>
            </div>

            <p className="doux text-[12px] leading-relaxed">{t.rassurance}</p>
          </div>
        )
      })}
    </section>
  )
}
