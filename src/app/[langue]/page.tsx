import Link from "next/link"
import { Reconnaitre, type DemandeARecconnaitre } from "./reconnaitre"
import { TempsReel } from "@/composants/temps-reel"
import { redirect } from "next/navigation"
import { MesCours } from "@/composants/mes-cours"
import { lireMesCours } from "@/lib/cours"

import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { api } from "@/lib/api"
import { lireParametres } from "@/lib/parametres"
import { supabaseServeur } from "@/lib/supabase/server"
import { Coque } from "@/composants/coque"

/**
 * Accueil élève — deux entrées, rien de plus (docs/SPEC_APPLICATION.md §2.1).
 * « Mes cours » n'apparaîtra qu'en v3, quand le parent aura activé les cours
 * à distance.
 *
 * Le middleware garde déjà cette route ; le contrôle ci-dessous est la
 * deuxième serrure, celle qui tient si la configuration du middleware change.
 */
export default async function Accueil({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Un visiteur sans session n'a pas forcément de compte. L'envoyer sur la
  // connexion suppose qu'il en a un : pour quelqu'un qui découvre TUTELA par
  // un lien partagé dans un groupe, c'est une porte fermée en guise d'accueil.
  // Celui qui a déjà un compte traverse l'inscription d'un clic ; celui qui
  // n'en a pas n'aurait pas trouvé son chemin.
  if (!user) redirect(chemin(langue, "/inscription"))

  const profil = await api<{
    prenom: string | null
    role: string
    photo_url: string | null
  }>("/v1/moi")

  // Chaque rôle a son chez-soi, et la racine n'est celui que de l'élève.
  //
  // L'aiguillage existait déjà, mais seulement au moment de la connexion : un
  // répétiteur qui revenait sur l'adresse racine — depuis un favori, un lien
  // partagé, ou simplement en effaçant la fin de l'adresse — tombait sur
  // l'accueil élève, avec un message qui ne le concernait pas : « ton espace
  // s'ouvrira quand un parent t'aura rattaché à son compte ».
  if (profil.role === "admin") redirect(chemin(langue, "/admin"))
  if (profil.role === "parent") redirect(chemin(langue, "/annuaire"))
  if (profil.role === "repetiteur") redirect(chemin(langue, "/repetiteur"))


  // Les entrées du tuteur IA ne s'affichent que si le module est allumé. Les
  // routes derrière refusent déjà, mais proposer un lien qui renvoie à la page
  // qu'on vient de quitter donne l'impression d'une application cassée — et
  // c'est bien ainsi qu'un élève l'a lu : « ça me met un écran pour créer le
  // tuteur », alors qu'il n'aurait jamais dû voir l'entrée.
  const { ia_active } = await lireParametres()

  // La liste des tuteurs ne sert qu'à savoir s'il en existe un : le module
  // peut être éteint, auquel cas on n'affiche pas l'entrée du tout.
  let tuteurs: { matiere: string; niveau: string }[] = []
  if (ia_active) {
    try {
      const rep = await api<{ donnees: typeof tuteurs }>("/v1/tuteurs")
      tuteurs = rep.donnees
    } catch {
      tuteurs = []
    }
  }

  const premier = tuteurs[0]

  // Les adultes qui disent être ses parents. En tête de son accueil, avant
  // tout le reste : c'est la question la plus importante qu'on puisse lui
  // poser, et il ne doit pas avoir à la chercher.
  let aReconnaitre: DemandeARecconnaitre[] = []
  try {
    const rep = await api<{ donnees: DemandeARecconnaitre[] }>(
      "/v1/liens/a-reconnaitre",
    )
    aReconnaitre = rep.donnees ?? []
  } catch {
    aReconnaitre = []
  }

  const cours = await lireMesCours()

  return (
    <div className="flex min-h-dvh flex-col">
      {/* La coque porte désormais l'avatar, les réglages et la sortie. Chaque
          écran bricolait les siens, et ils finissaient par ne plus se
          ressembler d'une page à l'autre. */}
      <Coque langue={langue} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-10 pt-6 lg:px-6">
        <header className="pt-2">
          <h1 className="text-[27px] font-medium tracking-[-0.02em] lg:text-[34px]">
            {remplir(d.accueil.bonjour, { prenom: profil.prenom ?? "" })}
          </h1>
          <p className="doux mt-1 text-sm">{d.accueil.question}</p>
        </header>

        {/* Une séance ouverte passe devant tout le reste : c'est la seule
            chose à faire à cet instant, et la chercher sous les cartes du
            tuteur serait la manquer. */}
        {cours.length > 0 ? (
          <MesCours cours={cours} langue={langue} d={d} />
        ) : null}

      {/* La demande d'un adulte arrive pendant que l'enfant est sur cet
          écran : il ne doit pas avoir à recharger pour la découvrir. */}

      <TempsReel tables={["demandes_rattachement"]} />

      <Reconnaitre demandes={aReconnaitre} langue={langue} />

      <div className="mt-4 flex flex-col gap-3">
        {ia_active ? (
          <Link
            href={chemin(langue, premier ? "/tuteur" : "/tuteur/nouveau")}
            className="choix-role"
          >
            <span className="font-medium">{d.accueil.monTuteur}</span>
            <span className="doux mt-0.5 block text-sm">
              {premier
                ? `${premier.matiere} — ${premier.niveau}`
                : d.accueil.creerTuteur}
            </span>
          </Link>
        ) : (
          <div className="carte p-5">
            <p className="font-medium">{d.accueil.enAttente}</p>
            <p className="doux mt-1 text-sm leading-relaxed">
              {d.accueil.enAttenteDetail}
            </p>
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
