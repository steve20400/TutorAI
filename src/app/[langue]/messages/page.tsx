import Link from "next/link"

import { Avatar } from "@/composants/avatar"
import { TempsReel } from "@/composants/temps-reel"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Coque } from "@/composants/coque"

type Fil = {
  id: string
  autre_id: string
  prenom: string | null
  nom: string | null
  photo_url: string | null
  dernier_texte: string | null
  dernier_le: string | null
  non_lus: number
}

/**
 * Les fils de discussion, vus par l'un ou par l'autre.
 *
 * Un seul écran pour le parent et le répétiteur : ce sont les mêmes fils, vus
 * de deux côtés. Deux écrans se seraient mis à diverger à la première
 * correction.
 *
 * L'absence de fil ne se dit pas pareil des deux côtés, et c'est le seul
 * endroit où ils diffèrent : un parent peut en ouvrir un, un répétiteur ne
 * peut qu'attendre — il répond, il n'aborde pas.
 */
export default async function PageMessages({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.messagerie

  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))

  let fils: Fil[] = []
  let role = "parent"
  try {
    const [m, moi] = await Promise.all([
      api<{ donnees: Fil[] }>("/v1/messagerie"),
      api<{ role: string }>("/v1/moi"),
    ])
    fils = m.donnees ?? []
    role = moi.role
  } catch {
    fils = []
  }

  const quand = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-GB", {
          day: "numeric",
          month: "short",
        })
      : ""

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} />
      <TempsReel tables={["messages_familles", "conversations"]} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-10 pt-6 lg:px-6">
        <header className="pt-2">
          <p className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.etiquette}
          </p>
          <h1 className="mt-1 text-[27px] font-medium tracking-[-0.02em] lg:text-[34px]">
            {t.titre}
          </h1>
        </header>

      {fils.length === 0 ? (
        <p className="doux text-sm leading-relaxed">
          {role === "repetiteur" ? t.aucunRepetiteur : t.aucun}
        </p>
      ) : (
        <ul className="flex flex-col">
          {fils.map((f) => (
            <li key={f.id}>
              <Link
                href={chemin(langue, `/messages/${f.id}`)}
                className="flex items-center gap-3 border-t py-3 transition hover:opacity-80"
                style={{ borderColor: "var(--bordure)" }}
              >
                <Avatar
                  nom={f.prenom ?? "?"}
                  photoUrl={f.photo_url}
                  taille={38}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {[f.prenom, f.nom].filter(Boolean).join(" ")}
                    </span>
                    <span className="doux shrink-0 text-[11px]">
                      {quand(f.dernier_le)}
                    </span>
                  </span>
                  <span className="doux mt-0.5 block truncate text-[12.5px]">
                    {f.dernier_texte ?? t.vide}
                  </span>
                </span>
                {f.non_lus > 0 ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                    style={{ background: "var(--voyant)", color: "#fff" }}
                    title={pluriel(langue, f.non_lus, t.nonLus)}
                  >
                    {f.non_lus}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        )}
      </main>
    </div>
  )
}
