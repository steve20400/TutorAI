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
import { TempsReel } from "@/composants/temps-reel"
import { MesAdultes, type AdulteRattache } from "./mes-adultes"
import { FormulairesCompte } from "@/composants/formulaires-compte"

import { ChoixCompte } from "./choix"
import { ChoixEnregistrement } from "@/composants/choix-enregistrement"
import { Coque } from "@/composants/coque"
import { Retour } from "@/composants/retour"

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
  let payeur: string | null = null

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

  // Qui a du pouvoir sur ce compte.
  //
  // Un enfant ne pouvait le voir nulle part. Pour une application dont la
  // promesse tient en un enfant jamais seul avec un adulte, ne pas lui dire
  // quels adultes sont rattachés à lui était un angle mort — il subissait un
  // rattachement qu'il avait pourtant accepté lui-même, sans jamais pouvoir le
  // relire.
  //
  // Ni adresse ni téléphone, comme partout ailleurs : cet écran ne doit pas
  // devenir un moyen d'apprendre comment joindre un adulte hors d'ici.
  // Le réglage d'enregistrement, pour un adulte seulement.
  //
  // Trois informations et pas une : allumé pour la plateforme, permis sur ce
  // compte, choisi par lui. L'écran a besoin des trois pour dire la vérité —
  // « ça n'existe pas », « ça existe et vous n'y avez pas droit », ou un
  // interrupteur qui marche. Un enfant n'en voit rien : il ne consent pas
  // pour lui-même, c'est son adulte qui le fait.
  let enregistrement: { allume: boolean; permis: boolean; souhaite: boolean } | null =
    null
  if (adulte) {
    try {
      const { data } = await supabase.rpc("mon_enregistrement")
      const ligne = Array.isArray(data) ? data[0] : data
      if (ligne) {
        enregistrement = {
          allume: Boolean(ligne.allume),
          permis: Boolean(ligne.permis),
          souhaite: Boolean(ligne.souhaite),
        }
      }
    } catch (erreur) {
      // Muet à l'écran, bruyant au journal : mieux vaut ne rien proposer que
      // proposer un interrupteur dont on ignore l'état.
      console.error("[compte] règle d'enregistrement illisible :", erreur)
    }
  }

  let mesAdultes: AdulteRattache[] | null = adulte ? [] : null
  if (!adulte) {
    try {
      const rep = await api<{ donnees: AdulteRattache[]; payeur: string | null }>(
        "/v1/liens/mes-parents",
      )
      mesAdultes = rep.donnees
      payeur = rep.payeur
    } catch {
      mesAdultes = null
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-6 lg:px-6">
        <Retour vers={chemin(langue, "/")} />
        <header className="pt-2">
          <h1 className="text-[27px] font-medium tracking-[-0.02em] lg:text-[34px]">
            {adulte ? t.titreAdulte : t.titre}
          </h1>
        </header>

      {/* Deux publics, deux formulaires.

          L'enfant choisit un dessin parmi cinquante et ne met pas de photo :
          c'est une règle du produit, pas une limite technique. L'adulte, lui,
          téléverse la sienne, corrige son nom et change son mot de passe —
          exactement ce que l'administration offrait déjà, et que son espace
          ne proposait nulle part. */}
      {adulte ? (
        <FormulairesCompte
          langue={langue}
          d={d}
          compte={compte}
          adresse={user.email ?? null}
        />
      ) : (
        <ChoixCompte
          langue={langue}
          d={d}
          prenom={compte.prenom}
          nom={compte.nom}
          identifiant={compte.identifiant}
          photoUrl={compte.photo_url}
          avatars={avatars}
        />
      )}

      {!adulte && compte.identifiant ? (
        <p className="doux text-[11.5px] leading-relaxed">
          {t.identifiant} : <b className="font-mono">{compte.identifiant}</b> —{" "}
          {t.identifiantFige}
        </p>
      ) : null}

      {!adulte ? (
        <section className="carte p-5">
          {/* Un rattachement accepté à l'instant doit apparaître ici sans
              rechargement : l'enfant vient peut-être de dire oui. */}
          <TempsReel tables={["liens_familiaux"]} />

          <div className="text-[14px] font-medium">{t.mesAdultes}</div>

          {mesAdultes === null ? (
            <p className="doux mt-2 text-[12px] leading-relaxed">
              {t.mesAdultesMuet}
            </p>
          ) : mesAdultes.length === 0 ? (
            <p className="doux mt-2 text-[12px] leading-relaxed">
              {t.mesAdultesAucun}
            </p>
          ) : (
            <MesAdultes
              adultes={mesAdultes}
              payeur={payeur}
              langue={langue}
              d={d}
            />
          )}
        </section>
      ) : null}

      {/* Rien du tout si l'administration n'a pas allumé : pas grisé, pas
          « bientôt » — absent. Montrer une fonctionnalité éteinte à
          quelqu'un qui ne peut rien en faire, c'est lui promettre ce qu'on ne
          tient pas. */}
      {enregistrement?.allume ? (
        <ChoixEnregistrement
          souhaite={enregistrement.souhaite}
          permis={enregistrement.permis}
        />
      ) : null}
      </main>
    </div>
  )
}
