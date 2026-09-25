import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { supabaseServeur } from "@/lib/supabase/server"

/**
 * Le passage du lien reçu par courriel.
 *
 * Le lien ne mène pas directement à la page où l'on choisit son mot de passe.
 * Il passe d'abord par ici, qui échange le jeton du courriel contre une
 * session — et c'est cette session, et elle seule, qui autorisera l'écriture.
 *
 * C'est ce qui fait tenir tout l'édifice : sans cela, n'importe qui
 * ouvrirait la page de changement et prendrait le compte d'un autre. Le jeton
 * est à usage unique et expire ; l'avoir reçu prouve l'accès à la boîte.
 */
export async function GET(requete: NextRequest) {
  const url = requete.nextUrl
  const token_hash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const suite = url.searchParams.get("next") ?? "/"

  if (!token_hash || !type) redirect("/")

  const supabase = await supabaseServeur()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  // Un lien périmé ou déjà utilisé renvoie vers la demande, avec un témoin
  // que la page lit : « ce lien n'est plus valable, demandez-en un autre ».
  //
  // L'écran ne dira jamais mieux — il n'a rien à apprendre à qui n'est pas
  // le destinataire du courriel. Mais nous devons savoir laquelle des deux
  // causes s'est produite, et il y en a d'autres : jeton d'un autre type,
  // quota atteint, horloge décalée. Toutes finissaient ici sous le même mot,
  // et cherchaient longtemps.
  if (error) {
    console.error(
      "[auth/confirm] jeton refusé :",
      error.code ?? error.name,
      "— type",
      type,
      "—",
      error.message,
    )
    redirect(`${suite}?lien=perime`)
  }

  redirect(suite)
}
