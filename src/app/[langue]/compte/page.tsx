import Link from "next/link"
import { redirect } from "next/navigation"

import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { api } from "@/lib/api"
import { AVATARS, type Avatar as AvatarChoisi } from "@/lib/avatars"
import { supabaseServeur } from "@/lib/supabase/server"

import { ChoixCompte } from "./choix"

type Compte = {
  id: string
  prenom: string | null
  nom: string | null
  role: string
  identifiant: string | null
  telephone: string | null
  photo_url: string | null
}

/**
 * Son propre compte, pour un élève ou un parent.
 *
 * L'administration a le sien sous `/admin/profil`, avec le mot de passe et
 * l'identifiant : ce sont des réglages qu'on ne met pas devant un enfant.
 */
export default async function PageCompte({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.compte

  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))

  const compte = await api<Compte>("/v1/compte")

  // Les cinquante avatars viennent de la base ; ceux du code servent de repli.
  // Un écran de choix vide est un écran dont on ne sort pas.
  let avatars: AvatarChoisi[] = [...AVATARS]
  try {
    const { donnees } = await api<{ donnees: AvatarChoisi[] }>("/v1/avatars", {
      sansSession: true,
    })
    if (donnees.length) avatars = donnees
  } catch {
    // repli conservé
  }

  const adulte = compte.role !== "eleve"

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 p-6">
      <header className="flex items-baseline justify-between pt-6">
        <h1 className="text-2xl font-medium">
          {adulte ? t.titreAdulte : t.titre}
        </h1>
        <Link
          href={chemin(langue, "/")}
          className="doux text-sm underline underline-offset-4"
        >
          {t.retour}
        </Link>
      </header>

      <ChoixCompte
        langue={langue}
        d={d}
        prenom={compte.prenom}
        nom={compte.nom}
        identifiant={compte.identifiant}
        photoUrl={compte.photo_url}
        avatars={avatars}
      />

      {compte.identifiant ? (
        <p className="doux text-[11.5px] leading-relaxed">
          {t.identifiant} : <b className="font-mono">{compte.identifiant}</b> —{" "}
          {t.identifiantFige}
        </p>
      ) : null}
    </main>
  )
}
