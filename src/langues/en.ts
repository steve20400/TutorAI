import type { Dictionnaire } from "./fr"

/**
 * English texts, for the North-West and South-West regions.
 *
 * Two vocabulary decisions worth keeping:
 *
 * — « répétiteur » becomes "tutor", never "repeater". The AI side always
 *   carries its qualifier ("AI tutor"), so the two never collide.
 * — « trace » becomes "record", which carries both meanings at once: what is
 *   written down, and what is recorded on video. That double meaning is the
 *   product, so it is worth more than a literal translation.
 */
export const en: Dictionnaire = {
  meta: {
    nom: "English",
    nomCourt: "EN",
    htmlLang: "en",
    titre: "TUTELA",
    description:
      "A verified tutor. A lesson that leaves a record. Home study where a child is never alone with an adult.",
  },

  commun: {
    seDeconnecter: "Sign out",
    quitter: "Leave",
    enCours: "One moment…",
    affichageClair: "Switch to light display",
    affichageSombre: "Switch to dark display",
    changerAffichage: "Change display",
    changerLangue: "Change language",
  },

  chargement: {
    aria: "Loading TUTELA",
    sloganLigne1: "A verified tutor.",
    sloganLigne2: "A lesson that leaves a record.",
    lent: "Slow connection — still going.",
  },

  promesses: [
    {
      mot: "Verified",
      detail: "ID and police record checked before the first lesson.",
    },
    {
      mot: "Recorded",
      detail: "Every lesson leaves a record the parent can watch.",
    },
    {
      mot: "Tracked",
      detail: "The child's work can be read, lesson after lesson.",
    },
  ],

  connexion: {
    etiquette: "Sign in",
    phare: "Good to see you again.",
    titre: "Welcome back.",
    sousTitre: "Student, parent or tutor — same door.",
    email: "Email or username",
    motDePasse: "Password",
    valider: "Sign in",
    pasDeCompte: "No account yet?",
    creerCompte: "Create an account",
  },

  inscription: {
    etiquette: "Sign up",
    phare: "Let's begin.",
    titre: "Create an account",
    sousTitre: "To start, you are…",
    dejaCompte: "Already have an account?",
    seConnecter: "Sign in",
    roles: {
      eleve: {
        titre: "I am a student",
        detail: "Revise, be questioned on my syllabus",
      },
      parent: {
        titre: "I am a parent",
        detail: "Follow my child, find a tutor I can trust",
      },
      repetiteur: {
        titre: "I am a tutor",
        detail: "Teach remotely, find students",
      },
    },
  },

  inscriptionRole: {
    eleve: {
      phare: "Welcome.",
      titre: "Create your student account",
      sousTitre: "You will choose your class and subjects right after.",
      prenom: "Your first name",
      email: "Your email",
      motDePasse: "Your password",
    },
    parent: {
      phare: "You will always know what happened.",
      titre: "Create your parent account",
      sousTitre:
        "You will then be able to add your children and follow their progress.",
      prenom: "Your first name",
      email: "Your email",
      motDePasse: "Your password",
    },
    repetiteur: {
      phare: "Your credibility, proven.",
      titre: "Create your tutor account",
      sousTitre:
        "Families will only see your profile once the checks are complete.",
      prenom: "Your first name",
      email: "Your email",
      motDePasse: "Your password",
    },
    nom: "Your surname",
    telephone: "Your phone number",
    aideTelephone:
      "Used by the team for verification, never shown to families",
    aideMotDePasse: "8 characters minimum",
    valider: "Create the account",
    changerRole: "Change role",
    seConnecter: "Sign in",
  },

  erreurs: {
    identifiantsIncorrects: "Wrong email or password.",
    emailNonConfirme:
      "Your email is not confirmed yet. Check your inbox.",
    compteExistant: "An account already exists with this email. Sign in.",
    motDePasseCourt: "The password is too short.",
    tropDeTentatives: "Too many attempts. Try again in a few minutes.",
    generique: "Something went wrong. Try again.",
    champsVides: "Fill in both fields.",
    roleManquant: "First choose whether you are a student, parent or tutor.",
    prenomManquant: "I need a first name.",
    emailManquant: "I need an email.",
    motDePasseTropCourt: "The password must be at least 8 characters.",
    compteCree:
      "Account created. Open the email sent to {email} to confirm, then sign in.",
  },

  accueil: {
    bonjour: "Hello {prenom}",
    question: "What are we doing today?",
    discuter: "Chat",
    discuterDetail: "Ask anything",
    monTuteur: "My AI tutor",
    creerTuteur: "Set up your AI tutor in 4 steps",
  },

  parent: {
    bonjour: "Hello {prenom}",
    espace: "Parent area",
    trouverRepetiteur: "Find a tutor",
    compteRepetiteurs: {
      one: "{n} verified tutor so far.",
      other: "{n} verified tutors so far.",
    },
    aucunRepetiteur:
      "No verified tutor yet. The directory opens as soon as the first profiles pass the checks.",
    annuaireEtape: "Directory — step 3",
    mesEnfants: "My children",
    mesEnfantsDetail:
      "Adding a child to your account gives you access to their progress: reports, lesson summaries and lesson recordings.",
    suiviEtape: "Progress — step 4",
  },

  repetiteurProfil: {
    titre: "My profile",
    statuts: {
      brouillon: {
        titre: "Profile not submitted",
        detail:
          "Complete your profile then submit it. Until it is verified, no family can see it.",
      },
      en_attente: {
        titre: "Checks under way",
        detail:
          "Our team is reviewing your documents. You will be told as soon as it is done.",
      },
      verifie: {
        titre: "Profile verified",
        detail: "Families can see your profile in the directory.",
      },
      refuse: {
        titre: "Profile rejected",
        detail: "Read the reason below, fix it, then submit again.",
      },
    },
  },

  /** Keys are the values actually stored in the database — never translate them. */
  matieres: {
    Mathématiques: "Mathematics",
    "Physique-Chimie": "Physics & Chemistry",
    SVT: "Biology",
    Français: "French",
    Anglais: "English",
    Philosophie: "Philosophy",
    "Histoire-Géographie": "History & Geography",
    Informatique: "Computer Science",
    Économie: "Economics",
  },

  /**
   * The anglophone Cameroonian sub-system has its own classes, so these are
   * equivalences rather than translations. The stored value stays French.
   */
  niveaux: {
    "6e": "Form 1",
    "5e": "Form 2",
    "4e": "Form 3",
    "3e": "Form 4",
    "2nde": "Form 5",
    "1ère": "Lower Sixth",
    Terminale: "Upper Sixth",
  },

  repetiteurFormulaire: {
    ceQueVousEnseignez: "What you teach",
    aQuelsNiveaux: "At what levels",
    vousPresenter: "Introduce yourself",
    quelquesLignes: "A few lines",
    bioPlaceholder: "Your background, how you work with a student…",
    bioAide: "This is often the only text a parent reads in full.",
    ville: "Town",
    villePlaceholder: "Bamenda",
    conditions: "Terms",
    tarif: "Monthly fee (FCFA)",
    experience: "Years of experience",
    disponibilites: "Availability",
    disponibilitesPlaceholder: "Weekdays after 5pm, Saturday morning",
    enregistrer: "Save",
    enregistrement: "Saving…",
    pieces:
      "Uploading your documents — ID, police record, certificates — comes at the next step.",
  },

  tuteur: {
    mesTuteurs: "My AI tutors",
    accueil: "Home",
    ajouterMatiere: "Add a subject",
    retour: "Back",
    reprendre: "Resume the current session",
    commencer: "Start a session",
    seancesPassees: "Past sessions",
    aucuneSeance: "No session yet. Your tutor is waiting.",
    leconNonIdentifiee: "Lesson not identified yet",
    aucunProgrammeTitre: "No syllabus available",
    aucunProgrammeDetail:
      "No official syllabus has been loaded into the database yet. A tutor cannot be created until that is done.",
    revenirAccueil: "Back to home",
    creerTitre: "Set up your AI tutor",
    quelPays: "Which country are you in?",
    quelSysteme: "Which sub-system do you follow?",
    francophone: "Francophone",
    anglophone: "Anglophone",
    quelleClasse: "Which class are you in?",
    quellesMatieres: "Which subjects?",
    aideMatieres: "One subject = one tutor. You can pick several.",
    manuels: "Your textbooks (optional)",
    aideManuels:
      "One title per line. It helps your tutor follow what your class is covering. You can skip this step.",
    etapeSur: "Step {n} of {total}",
    continuer: "Continue",
    recapitulatif: "Summary",
    creation: "Setting up…",
    creerMonTuteur: "Set up my tutor",
    pays: { CM: "Cameroon", CI: "Ivory Coast" },
  },

  seance: {
    ecrisTaReponse: "Write your answer…",
    envoyer: "Send",
    envoiEchoue: "Sending failed. Try again.",
    pasDeConnexion: "No connection. Check your network and try again.",
  },

  admin: {
    titre: "Administration",
    eleves: "Students",
    parents: "Parents",
    repetiteurs: "Tutors",
    aVerifier: "To check",
    modules: "Modules",
    actif: "On",
    eteint: "Off",
    activer: "Turn on",
    eteindre: "Turn off",
    interrupteurs: {
      ia_active: {
        titre: "AI tutor",
        detail:
          "While it is off, the tutor setup screen does not appear and the route that calls the model refuses. Requires an Anthropic key.",
      },
      enregistrement_actif: {
        titre: "Lesson recording",
        detail:
          "Turn it off in development to save storage. In production it must stay on: it is the promise made to parents.",
      },
      paiement_actif: {
        titre: "Mobile money payment",
        detail: "Orange Money and MTN MoMo. Requires an aggregator's API keys.",
      },
      inscriptions_ouvertes: {
        titre: "New sign-ups",
        detail:
          "Closes the door without cutting off the people who already have an account.",
      },
    },
    avertissementEnregistrement:
      "⚠ No lesson is recorded while this is off.",
    resolutionTitre: "Recording quality",
    resolutionDetail:
      "A safety recording has to be readable, not beautiful. The lower the resolution, the less storage it costs — and the better it travels on your users' networks.",
    resolutionCout: "≈ {taille} per hour of lesson.",
    journal:
      "Every change is written to the administration log, with its author and timestamp.",
  },
}
