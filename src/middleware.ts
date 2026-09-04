import type { NextRequest } from "next/server"
import { actualiserSession } from "@/lib/supabase/middleware"

export async function middleware(requete: NextRequest) {
  return actualiserSession(requete)
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     *   - les fichiers internes de Next (_next/static, _next/image)
     *   - les fichiers statiques (favicon, images, manifeste PWA)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
