import { NextResponse, type NextRequest } from "next/server"

import { api, ErreurApi } from "@/lib/api"

/**
 * Marquer lus les messages d'un fil, depuis le navigateur.
 *
 * La page le faisait déjà à son ouverture, et cela suffisait tant que chaque
 * message reçu rejouait la page entière. Ce rafraîchissement a disparu — il
 * faisait sauter la vue et vidait le champ en cours de frappe — et avec lui
 * cette écriture : un message arrivé pendant qu'on lisait le fil restait
 * compté comme non lu, et la pastille mentait sur un écran grand ouvert.
 *
 * C'est le genre d'effet qu'un correctif laisse derrière lui sans que rien ne
 * le signale : la fonctionnalité qu'on retire portait quelque chose d'autre.
 *
 * `API_URL` reste privée : le navigateur parle à l'application, l'application
 * parle au service, avec le jeton de la session. La base vérifie ensuite que
 * ce fil est bien le sien.
 */
export async function POST(requete: NextRequest) {
  const corps = (await requete.json()) as { conversation?: string }

  if (!corps.conversation) {
    return NextResponse.json({ erreur: "requete_incomplete" }, { status: 400 })
  }

  try {
    await api(`/v1/messagerie/${corps.conversation}/lus`, { methode: "POST" })
    return NextResponse.json({ ok: true })
  } catch (erreur) {
    // Sans conséquence visible : la pastille restera, ce qui est désagréable
    // et rien de plus. On le dit quand même, pour pouvoir le chercher.
    if (erreur instanceof ErreurApi) {
      return NextResponse.json(
        { erreur: erreur.code, message: erreur.message },
        { status: erreur.statut },
      )
    }
    return NextResponse.json({ erreur: "service" }, { status: 502 })
  }
}
