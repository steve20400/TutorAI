import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { supabaseServeur } from "@/lib/supabase/server"
import { pageDeRelais } from "./relais"

const TYPES: EmailOtpType[] = [
  "email",
  "recovery",
  "email_change",
  "magiclink",
  "invite",
  "signup",
]

/**
 * Le passage du lien reçu par courriel.
 *
 * Le lien ne mène pas directement à la page où l'on choisit son mot de passe.
 * Il passe d'abord par ici, qui échange le jeton du courriel contre une
 * session — et c'est cette session, et elle seule, qui autorisera l'écriture.
 *
 * C'est ce qui fait tenir tout l'édifice : sans cela, n'importe qui ouvrirait
 * la page de changement et prendrait le compte d'un autre. Le jeton est à
 * usage unique et expire ; l'avoir reçu prouve l'accès à la boîte.
 *
 * ---
 *
 * Mais « à usage unique » se retourne contre nous si quelqu'un d'autre s'en
 * sert le premier. Et il y a foule : Brevo réécrit les liens pour compter les
 * clics et les visite, les antivirus de messagerie les ouvrent pour vérifier
 * où ils mènent, Office 365 et Gmail les préchargent. Aucun de ces visiteurs
 * n'est malveillant, et tous consomment le jeton. La personne clique ensuite
 * et lit « ce lien n'est plus valable » — sur un courriel reçu à l'instant.
 *
 * D'où ce détour : **un GET ne consomme plus rien**. Il rend une page qui ne
 * fait qu'afficher un bouton. Le jeton n'est échangé qu'au POST, c'est-à-dire
 * après un vrai clic d'une vraie personne. Les robots lisent la page, ne
 * l'envoient pas, et repartent sans rien abîmer.
 *
 * Le coût est un clic de plus. Le gain est que le lien fonctionne.
 */
export function GET(requete: NextRequest) {
  const url = requete.nextUrl
  const token_hash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  const suite = url.searchParams.get("next") ?? "/"

  if (!token_hash || !type) redirect("/")

  return new Response(pageDeRelais({ token_hash, type, suite }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Un lien à usage unique n'a rien à faire dans un cache partagé.
      "cache-control": "no-store, private",
      // Certains préchargeurs suivent les indices qu'on leur donne.
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  })
}

/** Le vrai passage, celui qu'une personne déclenche. */
export async function POST(requete: NextRequest) {
  const corps = await requete.formData()
  const token_hash = String(corps.get("token_hash") ?? "")
  const brut = String(corps.get("type") ?? "")
  const suite = String(corps.get("next") ?? "/") || "/"

  const type = TYPES.find((t) => t === brut)
  if (!token_hash || !type) redirect("/")

  // `next` vient de l'adresse : on n'accepte qu'un chemin interne, sinon le
  // lien du courriel deviendrait un tremplin vers n'importe quel site.
  const destination = suite.startsWith("/") && !suite.startsWith("//") ? suite : "/"

  const supabase = await supabaseServeur()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    // L'écran ne dira jamais mieux — il n'a rien à apprendre à qui n'est pas
    // le destinataire du courriel. Mais nous devons savoir laquelle des
    // causes s'est produite : jeton déjà servi, périmé, d'un autre type,
    // quota atteint.
    console.error(
      "[auth/confirm] jeton refusé :",
      error.code ?? error.name,
      "— type",
      type,
      "—",
      error.message,
    )
    redirect(`${destination}?lien=perime`)
  }

  redirect(destination)
}
