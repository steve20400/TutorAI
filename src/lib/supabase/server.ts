import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Client Supabase côté serveur, lié à la session de l'utilisateur.
 * La RLS s'applique : ce client ne voit que ce que l'élève (ou son parent)
 * a le droit de voir. C'est volontaire — voir supabase/schema.sql §7.
 */
export async function supabaseServeur() {
  const jar = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cookiesASetter) => {
          try {
            for (const { name, value, options } of cookiesASetter) {
              jar.set(name, value, options)
            }
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchit la session.
          }
        },
      },
    },
  )
}
