"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
  type Dictionnaire,
  type Langue,
} from "@/langues"
import { api, ErreurApi } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { origineDuSite } from "@/lib/origine"

export type EtatFormulaire = {
  erreur?: string
  info?: string
}


/**
 * Langue transmise par le formulaire.
 *
 * Chaque formulaire porte un champ caché `langue`. Sans lui, une action
 * serveur ne saurait ni dans quelle langue rédiger son message d'erreur, ni
 * vers quelle adresse rediriger — et renverrait un anglophone sur une page
 * française.
 */
function langueDe(donnees: FormData): Langue {
  const brut = String(donnees.get("langue") ?? "")
  return estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
}

/**
 * Met un nom de connexion en forme, comme `normaliser_identifiant` en base.
 *
 * Trois endroits appliquent cette règle : le champ, pour montrer tout de
 * suite ce qui sera enregistré ; ici, parce que ce qui arrive d'un formulaire
 * n'est jamais ce qu'on croit ; et la base, qui fait foi. Les deux premiers
 * ne protègent pas, ils évitent une surprise.
 */
function normaliserIdentifiant(saisie: string): string {
  return saisie
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9'\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Messages d'erreur Supabase traduits. Personne ne doit lire de l'anglais brut. */
function traduire(message: string, d: Dictionnaire, contact: string): string {
  const m = message.toLowerCase()
  // Un compte désactivé doit le savoir, et savoir où écrire. « Identifiants
  // incorrects » ferait ressaisir indéfiniment un mot de passe pourtant juste,
  // et un refus sans adresse de contact est une porte fermée sans sonnette.
  //
  // Le motif lui-même n'est PAS affiché ici : il faudrait le lire avant toute
  // authentification, donc le livrer à qui saisit un identifiant au hasard.
  // C'est par écrit qu'on le donne, à quelqu'un dont on sait qui il est.
  if (m.includes("banned")) {
    return remplir(d.erreurs.compteDesactive, { contact })
  }
  if (m.includes("invalid login credentials"))
    return d.erreurs.identifiantsIncorrects
  if (m.includes("email not confirmed")) return d.erreurs.emailNonConfirme
  if (m.includes("user already registered")) return d.erreurs.compteExistant
  if (m.includes("password should be at least")) return d.erreurs.motDePasseCourt
  if (m.includes("rate limit") || m.includes("too many"))
    return d.erreurs.tropDeTentatives
  return d.erreurs.generique
}

/**
 * Adresse à laquelle on conteste une décision.
 *
 * Lue en base et non codée ici : elle changera le jour où une vraie boîte de
 * contact existera, et il ne faudra pas redéployer pour ça. En cas de panne,
 * on retombe sur une chaîne vide plutôt que d'empêcher la connexion — le
 * message perd sa fin, la porte reste ouverte.
 */
async function contactAdministration(): Promise<string> {
  try {
    const { contact_administration } = await api<{
      contact_administration?: string
    }>("/v1/contact", { sansSession: true })
    return contact_administration ?? ""
  } catch {
    return ""
  }
}

export async function seConnecter(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const langue = langueDe(donnees)
  const d = dictionnaire(langue)

  const saisie = String(donnees.get("email") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")
  const suite = String(donnees.get("suite") ?? "")

  if (!saisie || !motDePasse) return { erreur: d.erreurs.champsVides }

  const supabase = await supabaseServeur()

  // L'administration se connecte par identifiant (« GALILEE »), les autres par
  // email. Une saisie sans arobase est donc traitée comme un identifiant et
  // résolue en base. Échec silencieux volontaire : si l'identifiant n'existe
  // pas, on laisse l'authentification répondre « identifiants incorrects »
  // plutôt que de révéler quels comptes existent.
  let email = saisie
  if (!saisie.includes("@")) {
    const { data } = await supabase.rpc("email_par_identifiant", { saisie })
    email = (data as string | null) ?? saisie
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  })

  if (error) return { erreur: traduire(error.message, d, await contactAdministration()) }

  revalidatePath("/", "layout")

  // On ne redirige que vers un chemin interne : une URL fournie par
  // l'utilisateur ne doit jamais servir à envoyer ailleurs.
  if (suite.startsWith("/") && !suite.startsWith("//")) {
    const accueil = chemin(langue, "/")
    if (suite !== accueil && suite !== "/") redirect(suite)
  }

  redirect(await accueilDeLUtilisateur(supabase, langue))
}

/**
 * Ouvre la session d'un compte qui vient d'être créé.
 *
 * Le même chemin que la connexion ordinaire : l'identifiant est résolu en
 * adresse interne, puis on se connecte. Recopier la logique de connexion ici
 * aurait fini par la faire diverger.
 */
async function ouvrirLaSession(
  identifiant: string,
  motDePasse: string,
  langue: Langue,
  d: ReturnType<typeof dictionnaire>,
): Promise<EtatFormulaire> {
  const supabase = await supabaseServeur()

  const { data } = await supabase.rpc("email_par_identifiant", {
    saisie: identifiant,
  })

  const { error } = await supabase.auth.signInWithPassword({
    email: (data as string | null) ?? identifiant,
    password: motDePasse,
  })

  if (error) {
    return { erreur: traduire(error.message, d, await contactAdministration()) }
  }

  revalidatePath("/", "layout")
  redirect(chemin(langue, "/"))
}

/** Rôles qu'un visiteur peut se donner lui-même. `admin` n'en fait pas partie. */
const ROLES_AUTORISES = ["eleve", "parent", "repetiteur"] as const
type RoleInscription = (typeof ROLES_AUTORISES)[number]

/** Où chaque rôle atterrit juste après son inscription. */
const ACCUEIL_PAR_ROLE: Record<RoleInscription, string> = {
  eleve: "/",
  // L'adulte arrive sur l'annuaire, pas sur un tableau de bord.
  //
  // Son accueil ne portait que deux cartes, et il arrivait dessus pour en
  // repartir aussitôt : ce qu'il vient faire, c'est trouver quelqu'un. Ce
  // qu'il y avait là vit maintenant sous « Mes enfants », dans le menu — et
  // ce qui presse, une demande de mot de passe qui ne dure qu'une heure,
  // s'annonce en bandeau au-dessus de l'annuaire.
  parent: "/annuaire",
  // Le répétiteur arrivait sur ses propres champs de saisie, comme s'il
  // n'existait ici qu'en tant que fiche à remplir. Il arrive sur son dossier,
  // tel qu'une famille le lit ; le formulaire est à un bouton de là.
  repetiteur: "/repetiteur",
}

/**
 * Accueil correspondant au rôle de l'utilisateur connecté.
 * Un répétiteur envoyé sur l'accueil élève verrait un espace qui ne le
 * concerne pas — et se demanderait s'il s'est trompé de compte.
 */
async function accueilDeLUtilisateur(
  supabase: Awaited<ReturnType<typeof supabaseServeur>>,
  langue: Langue,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return chemin(langue, "/")

  const { data } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = data?.role as RoleInscription | "admin" | undefined
  if (role === "admin") return chemin(langue, "/admin")
  if (role === "parent") return chemin(langue, ACCUEIL_PAR_ROLE.parent)
  if (role === "repetiteur") return chemin(langue, ACCUEIL_PAR_ROLE.repetiteur)
  return chemin(langue, ACCUEIL_PAR_ROLE.eleve)
}

export async function sInscrire(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const langue = langueDe(donnees)
  const d = dictionnaire(langue)

  const prenom = String(donnees.get("prenom") ?? "").trim()
  const nom = String(donnees.get("nom") ?? "").trim()
  const telephone = String(donnees.get("telephone") ?? "").trim()
  const email = String(donnees.get("email") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")
  const roleBrut = String(donnees.get("role") ?? "")
  // Déjà mis en forme par le champ, remis en forme ici : ce qui arrive d'un
  // formulaire n'est jamais ce qu'on croit. La base le normalisera une
  // troisième fois, et c'est elle qui fait foi.
  const identifiant = normaliserIdentifiant(
    String(donnees.get("identifiant") ?? ""),
  )

  // Le rôle arrive du navigateur : il est vérifié contre une liste fermée.
  // Sans ce contrôle, un champ modifié à la main suffirait à se déclarer
  // administrateur — et `est_admin()` ouvre toutes les politiques RLS.
  if (!ROLES_AUTORISES.includes(roleBrut as RoleInscription)) {
    return { erreur: d.erreurs.roleManquant }
  }
  const role = roleBrut as RoleInscription

  if (!prenom) return { erreur: d.erreurs.prenomManquant }

  // Le nom de connexion, vérifié avant tout le reste.
  //
  // Avant, et pas après : apprendre que son nom est pris une fois le compte
  // créé, c'est découvrir des jours plus tard qu'on en porte un autre — ce
  // que faisait le déclencheur, qui en attribuait un en silence.
  //
  // La course entre deux inscriptions simultanées sur le même nom reste
  // possible ; c'est la base qui tranche alors, et elle le dit.
  if (!identifiant) return { erreur: d.inscriptionRole.identifiantManquant }
  if (identifiant.length < 3) {
    return { erreur: d.inscriptionRole.identifiantCourt }
  }
  {
    const supabase = await supabaseServeur()
    const { data } = await supabase.rpc("identifiant_disponible", {
      saisie: identifiant,
    })
    if (data !== true) {
      return {
        erreur:
          role === "eleve"
            ? d.inscriptionRole.identifiantPrisEnfant
            : d.inscriptionRole.identifiantPris,
      }
    }
  }

  // ── L'enfant venu seul ───────────────────────────────────────────────────
  //
  // Ni adresse, ni confirmation par courriel : une adresse est un canal vers
  // lui qui ne passe pas par la plateforme, et tout le produit est bâti pour
  // qu'aucun adulte n'ait de canal privé vers un enfant.
  //
  // Le service crée le compte — c'est le seul endroit où un visiteur anonyme
  // écrit dans `auth.users`, et le plafond horaire vit là-bas — puis on ouvre
  // sa session ici avec l'identifiant qu'il nous rend.
  //
  // Six caractères et non huit : il doit pouvoir le taper seul.
  if (role === "eleve") {
    if (motDePasse.length < 6) return { erreur: d.erreurs.motDePasseTropCourt }

    // Celui que le service rend : normalement celui qu'il a choisi, mais
    // c'est la base qui l'écrit, et c'est avec celui-là qu'on ouvre sa
    // session. Lui en supposer un autre le laisserait à la porte.
    let attribue: string
    try {
      const rendu = await api<{ identifiant: string }>(
        "/v1/inscription/enfant",
        {
          methode: "POST",
          corps: {
            prenom,
            nom: nom || undefined,
            motDePasse,
            identifiant,
          },
          sansSession: true,
        },
      )
      attribue = rendu.identifiant
    } catch (e: unknown) {
      return {
        erreur:
          e instanceof ErreurApi ? e.message : d.erreurs.inscriptionEchouee,
      }
    }

    return ouvrirLaSession(attribue, motDePasse, langue, d)
  }

  if (!email) return { erreur: d.erreurs.emailManquant }
  if (motDePasse.length < 8) return { erreur: d.erreurs.motDePasseTropCourt }

  // Le dépôt des pièces, ouvert par le navigateur avant que ce compte
  // n'existe. Vide tant qu'aucun fichier n'est parti.
  //
  // La carte d'identité est exigée, et c'est la seule exigence : sans elle,
  // personne ne peut vérifier qui est cette personne, et nous n'aurions rien
  // à vendre d'autre qu'une liste de noms. Le casier et les diplômes pèsent
  // dans la décision, ils ne la conditionnent pas — le casier judiciaire est
  // long à obtenir au Cameroun, et l'exiger ici viderait l'annuaire.
  const depot = String(donnees.get("depot") ?? "").trim()
  const supabase = await supabaseServeur()

  if (role === "repetiteur") {
    // Demandé à la base, et non à un champ caché du formulaire : le
    // navigateur remplit les champs cachés, donc n'importe qui les remplit.
    // La question est fermée, la réponse est un booléen, et elle ne révèle
    // rien de ce que contient le dépôt.
    let aSaCarte = false
    if (depot) {
      const { data } = await supabase.rpc("depot_porte", {
        le_jeton: depot,
        type_piece: "cni",
      })
      aSaCarte = data === true
    }
    if (!aSaCarte) return { erreur: d.inscriptionPieces.sansCni }
  }

  // `data` alimente le déclencheur `sur_nouvel_utilisateur` du schéma, qui
  // crée la ligne dans `profils`. Les clés doivent correspondre exactement.
  // Le lien de confirmation repasse par `/auth/confirm`, qui échange le jeton
  // contre une session. Le `next` porte la langue : sans lui, un inscrit
  // anglophone atterrirait sur un écran français. C'est aussi cette adresse
  // que le modèle de courriel lit sous le nom `{{ .RedirectTo }}` — elle doit
  // figurer dans Authentication → URL Configuration, sinon Supabase la
  // remplace sans le dire.
  const origine = await origineDuSite()
  const suite = chemin(langue, ACCUEIL_PAR_ROLE[role])

  const { data, error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      emailRedirectTo: `${origine}/auth/confirm?next=${encodeURIComponent(suite)}`,
      data: {
        prenom,
        nom: nom || null,
        telephone: telephone || null,
        role,
        identifiant,
        pays: process.env.NEXT_PUBLIC_PAYS_PAR_DEFAUT ?? "CM",
        langue,
        // Lu par `gerer_nouvel_utilisateur`, qui rattache les pièces à la
        // fiche qu'il vient de créer. Ce champ vient du navigateur et n'est
        // pas digne de confiance — pas plus que `role`, que le déclencheur
        // ramène à une liste fermée. Celui-ci ne donne aucun pouvoir : au
        // pire on rattache à son propre compte des fichiers qu'on a soi-même
        // déposés, ce qui est l'usage prévu.
        depot: depot || null,
      },
    },
  })

  if (error) return { erreur: traduire(error.message, d, await contactAdministration()) }

  // Une adresse déjà prise ne lève PAS d'erreur, et c'est le piège.
  //
  // Supabase protège contre l'énumération des adresses : plutôt que de
  // répondre « ce compte existe », il rend un utilisateur factice — même
  // forme, aucune identité, aucune session — exactement comme une inscription
  // qui attend sa confirmation. Les deux cas se ressemblaient donc, et le
  // second message s'affichait pour le premier : « vérifiez votre boîte »,
  // sur un courriel qui n'arrivera jamais. Steve l'a rencontré en s'inscrivant
  // comme répétiteur avec l'adresse de l'administration : tout semblait
  // marcher, et rien n'avait été créé.
  //
  // `identities` est ce qui les sépare : une vraie inscription en porte une,
  // le leurre n'en porte aucune.
  //
  // Le dire coûte quelque chose, et c'est un choix assumé : on confirme à qui
  // demande qu'une adresse a un compte ici. En face, laisser quelqu'un
  // attendre un courriel qui n'existe pas lui fait perdre son compte, pas
  // seulement sa soirée — et il recommencera, avec la même adresse.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { erreur: d.erreurs.compteExistant }
  }

  // Si la confirmation par email est active dans Supabase, aucune session
  // n'est ouverte tout de suite.
  //
  // Et le répétiteur n'a pas la même suite que l'adulte. L'adulte confirme
  // son adresse et entre. Lui, son dossier part en vérification : confirmer
  // son adresse ne lui ouvre rien tant que l'administration n'a pas regardé
  // ses pièces. Lui dire « puis connecte-toi » l'envoyait buter contre un
  // espace vide sans comprendre ce qu'il attendait.
  if (!data.session) {
    return {
      info: remplir(
        role === "repetiteur" ? d.erreurs.dossierSoumis : d.erreurs.compteCree,
        { email },
      ),
    }
  }

  revalidatePath("/", "layout")
  redirect(chemin(langue, ACCUEIL_PAR_ROLE[role]))
}

export async function seDeconnecter(donnees: FormData): Promise<void> {
  const langue = langueDe(donnees)
  const supabase = await supabaseServeur()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect(chemin(langue, "/connexion"))
}
