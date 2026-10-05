import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { FilMessages, type Message } from "@/composants/fil-messages"
import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { Coque } from "@/composants/coque"

type Fil = {
  id: string
  prenom: string | null
  nom: string | null
  photo_url: string | null
}

/**
 * Un fil entre une famille et un répétiteur.
 *
 * Le nom d'en face vient de la liste des fils et non d'une lecture de profil :
 * ni le parent ni le répétiteur n'a le droit de lire le profil de l'autre, et
 * c'est très bien ainsi — ils se parlent ici, pas ailleurs.
 *
 * Les messages de l'autre sont marqués lus à l'ouverture. Pas au défilement,
 * pas à la réponse : ouvrir le fil, c'est les avoir vus.
 */
export default async function PageFil({
  params,
}: {
  params: Promise<{ langue: string; id: string }>
}) {
  const { langue: brut, id } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.messagerie

  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))

  let messages: Message[] = []
  let moi = ""
  let fil: Fil | null = null

  try {
    const [m, liste] = await Promise.all([
      api<{ donnees: Message[]; moi: string }>(`/v1/messagerie/${id}`),
      api<{ donnees: Fil[] }>("/v1/messagerie"),
    ])
    messages = m.donnees ?? []
    moi = m.moi
    fil = (liste.donnees ?? []).find((f) => f.id === id) ?? null
  } catch {
    fil = null
  }

  // Un fil qui n'est pas le sien ne rend rien : la RLS l'a déjà écarté.
  if (!fil) notFound()

  // Ouvrir le fil vaut lecture. L'échec est sans conséquence : la pastille
  // restera, ce qui est désagréable et rien de plus.
  try {
    await api(`/v1/messagerie/${id}/lus`, { methode: "POST" })
  } catch {
    // on continue
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 lg:px-6">
      {/* Plus de `TempsReel` ici, et c'est le correctif.

          Il rafraîchissait la page entière à chaque message reçu : la liste
          des fils redemandée au service, les messages relus, l'écran
          remplacé — et le « marquer comme lu » ci-dessus renvoyé au passage,
          une écriture de plus par message. La vue sautait, et ce qu'on était
          en train d'écrire vivait dans un champ qu'on venait de remonter.

          C'est `FilMessages` qui écoute maintenant, et qui AJOUTE le message
          reçu. Une conversation ne fait qu'ajouter à la fin : c'est la seule
          forme de donnée où l'état local ne peut pas contredire le serveur. */}

      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b py-3"
        style={{ borderColor: "var(--bordure)", background: "var(--fond)" }}
      >
        <Link
          href={chemin(langue, "/messages")}
          aria-label={t.retour}
          className="doux shrink-0"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="block"
          >
            <path d="M14 7l-5 5 5 5" />
          </svg>
        </Link>
        <span className="truncate text-[15px] font-medium">
          {[fil.prenom, fil.nom].filter(Boolean).join(" ")}
        </span>
      </header>

      {/* Dit une fois, en haut du fil, et pas à chaque message. */}
      <p className="doux py-3 text-[11.5px] leading-relaxed">{t.cadre}</p>

      <FilMessages
        messages={messages}
        moi={moi}
        conversationId={id}
        langue={langue}
        d={d}
      />
      </main>
    </div>
  )
}
