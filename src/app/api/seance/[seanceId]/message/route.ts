import { NextResponse } from "next/server"
import { lireParametres } from "@/lib/parametres"
import { supabaseServeur } from "@/lib/supabase/server"
import { repondreCommeTuteur } from "@/lib/anthropic"

export const runtime = "nodejs"

/**
 * Garde-fous de coût. Chaque message part chez Anthropic et se paie.
 *
 * Sans ces deux limites, une boucle dans le code ou un élève qui s'amuse
 * suffit à faire grimper la facture sans qu'aucune alerte ne se déclenche.
 * Le compteur s'appuie sur la table `messages` : pas de service en plus,
 * pas de Redis, et il fonctionne malgré les démarrages à froid de Vercel —
 * ce qu'un compteur en mémoire ne ferait pas.
 */
const MESSAGES_PAR_HEURE = 30
const LONGUEUR_MAX = 4000

/**
 * POST /api/seance/:seanceId/message
 *
 * L'élève envoie un message ; le tuteur répond.
 *
 * `pageDuJour` (texte extrait d'une photo du manuel) est reçu, transmis au
 * modèle pour cette requête, puis abandonné. Il n'est écrit nulle part —
 * c'est la règle du §6 de la spec, et elle est tenue ici par construction.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ seanceId: string }> },
) {
  const { seanceId } = await params
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erreur: "non authentifié" }, { status: 401 })
  }

  // Le tuteur IA est un module qu'on allume depuis l'administration, et chaque
  // appel coûte des crédits Anthropic. La garde est ici et pas seulement sur
  // la page : masquer un écran n'empêche personne d'appeler la route qui se
  // trouve derrière. Sans elle, n'importe quel compte connecté pouvait faire
  // dépenser la plateforme alors que le module était éteint.
  const { ia_active } = await lireParametres()
  if (!ia_active) {
    return NextResponse.json(
      { erreur: "module_desactive" },
      { status: 403 },
    )
  }

  const corps = (await requete.json()) as {
    contenu?: string
    pageDuJour?: string
  }

  const contenu = corps.contenu?.trim()
  if (!contenu) {
    return NextResponse.json({ erreur: "message vide" }, { status: 400 })
  }

  if (contenu.length > LONGUEUR_MAX) {
    return NextResponse.json(
      {
        erreur:
          "Ce message est trop long. Découpe-le, ou photographie la page plutôt que de tout recopier.",
      },
      { status: 413 },
    )
  }

  // La RLS restreint déjà `messages` aux séances de cet élève : ce décompte
  // ne peut donc porter que sur les siens.
  const ilYaUneHeure = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("auteur", "eleve")
    .gte("cree_le", ilYaUneHeure)

  if ((count ?? 0) >= MESSAGES_PAR_HEURE) {
    return NextResponse.json(
      {
        erreur:
          "Tu as beaucoup travaillé cette heure-ci. Fais une pause et reviens dans un moment.",
      },
      { status: 429 },
    )
  }

  // La RLS filtre : si la séance n'appartient pas à cet élève, rien ne remonte.
  const { data: seance, error: erreurSeance } = await supabase
    .from("seances")
    .select(
      `id, statut, mode, lecon_titre,
       tuteur:tuteurs_ia!inner (
         id, matiere, niveau,
         programme:programmes!inner ( contenu ),
         memoire:memoire_eleve ( notions_acquises, notions_fragiles, erreurs_recurrentes )
       )`,
    )
    .eq("id", seanceId)
    .single()

  if (erreurSeance || !seance) {
    return NextResponse.json({ erreur: "séance introuvable" }, { status: 404 })
  }

  if (seance.statut !== "en_cours") {
    return NextResponse.json({ erreur: "séance terminée" }, { status: 409 })
  }

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom, pays")
    .eq("id", user.id)
    .single()

  const { data: historiqueExistant } = await supabase
    .from("messages")
    .select("auteur, contenu")
    .eq("seance_id", seanceId)
    .order("id", { ascending: true })

  // 1. On enregistre le message de l'élève.
  const { error: erreurInsertion } = await supabase
    .from("messages")
    .insert({ seance_id: seanceId, auteur: "eleve", contenu })

  if (erreurInsertion) {
    return NextResponse.json({ erreur: "écriture impossible" }, { status: 500 })
  }

  // 2. On interroge le modèle.
  const tuteur = Array.isArray(seance.tuteur) ? seance.tuteur[0] : seance.tuteur
  const programme = Array.isArray(tuteur.programme)
    ? tuteur.programme[0]
    : tuteur.programme
  const memoire = Array.isArray(tuteur.memoire) ? tuteur.memoire[0] : tuteur.memoire

  let reponse: string
  try {
    reponse = await repondreCommeTuteur({
      prenomEleve: profil?.prenom ?? "l'élève",
      niveau: tuteur.niveau,
      pays: profil?.pays ?? "CM",
      matiere: tuteur.matiere,
      mode: seance.mode,
      programme: programme.contenu,
      memoire: memoire
        ? { ...memoire, tuteur_id: tuteur.id, maj_le: "" }
        : null,
      leconTitre: seance.lecon_titre,
      historique: [
        ...(historiqueExistant ?? []),
        { auteur: "eleve" as const, contenu },
      ],
      pageDuJour: corps.pageDuJour, // éphémère — voir en-tête de fichier
    })
  } catch (e) {
    console.error("appel modèle échoué", e)
    return NextResponse.json(
      { erreur: "le tuteur est momentanément indisponible" },
      { status: 502 },
    )
  }

  // 3. On enregistre la réponse du tuteur.
  await supabase
    .from("messages")
    .insert({ seance_id: seanceId, auteur: "tuteur", contenu: reponse })

  return NextResponse.json({ reponse })
}
