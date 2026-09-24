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
    choisirPhoto: "Choose a photo",
    changerPhoto: "Change photo",
    retirerPhoto: "Remove",
    photoEnvoyee: "photo saved",
    photoEnvoi: "Uploading…",
    photoTropGrande:
      "This image is too heavy even after resizing. Try another one.",
    photoMauvaisType: "Choose an image: JPEG, PNG or WebP.",
    photoEchec: "Upload failed. Check your connection and try again.",
    photoDifferee: "upload postponed, it will resume on its own",
    voirLaPhoto: "View photo",
    fermerLaPhoto: "Close",
    telechargerLaPhoto: "Download",
    seDeconnecter: "Sign out",
    quitter: "Leave",
    enCours: "One moment…",
    affichageClair: "Switch to light display",
    affichageSombre: "Switch to dark display",
    changerAffichage: "Change display",
    changerLangue: "Change language",
  },

  introuvable: {
    titre: "This page does not exist.",
    detail:
      "The address may have been mistyped, or the page has been renamed since the link was shared with you.",
    retour: "Back to home",
    code: "Error 404",
  },

  compte: {
    titre: "Your account",
    titreAdulte: "Your account",
    prenom: "First name",
    nom: "Last name",
    telephone: "Phone",
    identifiant: "Sign-in username",
    identifiantFige:
      "This is what you sign in with. It was chosen when your account was created and does not change.",
    avatar: "Choose your picture",
    avatarAide:
      "You do not put a photo here. Pick a drawing, or keep your initials.",
    sansAvatar: "My initials",
    enregistrer: "Save",
    enregistre: "Saved.",
    retour: "Back",
  },

  jaugeEleve: {
    titre: "Your sessions with the tutor",
    detail: "The bar shows what is left. It goes down with each answer, and fills up when an adult in your family tops up your account.",
    epuise: "There are no tokens left for now. Ask an adult in your family to top up your account.",
    etiquette: "See what is left",
    quiPaie: "Who carries your sessions",
    enCours: "current",
  },

  essai: {
    titre: "Try the tutor, right now.",
    sousTitre: "Ask it a question from your syllabus. It does not give answers: it makes you find them.",
    avertissement: "No account, no email address. In exchange, this conversation disappears when you close this page — and the trial is short.",
    placeholder: "Write your question…",
    terminePlaceholder: "The trial is over.",
    envoyer: "Send",
    termine: "The trial is over. Create an account to carry on: your tutor will then remember your work from one session to the next.",
    tropDEssais: "You have already tried several times today. Create an account to carry on.",
    indisponible: "The tutor is not answering right now. Try again in a moment.",
    pannes: {
      surcharge: "The tutor is very busy right now. Wait a moment and send your message again.",
      cle: "The tutor is not available at the moment.",
      modele: "The tutor is not available at the moment.",
      autre: "The tutor is not answering right now. Try again in a moment.",
      termine: "The trial is over.",
    },
    jaugeTitre: "Your trial",
    jaugeDetail: "This trial is limited. The bar shows what is left — it goes down with each answer. With an account there is no such limit, and your tutor remembers your work.",
    jaugeFinie: "Your trial is over. Create an account to carry on.",
    jaugeEtiquette: "See what is left of the trial",
    pied: "Nothing of this conversation is saved.",
    creerUnCompte: "Create an account",
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
    essayerIA: "Try Tutela AI",
    essayerIADetail: "no account — nothing is kept",
    seConnecter: "Sign in",
    roles: {
      eleve: {
        titre: "I am a child",
        detail: "Revise, be questioned on my syllabus",
      },
      parent: {
        titre: "I am an adult",
        detail: "Find a tutor, for me or for my child",
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
      titre: "Create your account",
      sousTitre: "You will choose your class and subjects right after.",
      prenom: "Your first name",
      email: "Your email",
      motDePasse: "Your password",
    },
    parent: {
      phare: "You will always know what happened.",
      titre: "Create your account",
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
    aideMotDePasseEnfant: "6 characters minimum. Pick one you will remember.",
    aideMotDePasse: "8 characters minimum",
    valider: "Create the account",
    avertissementEnfant: "You do not need an email address. But remember your password well: until an adult is linked to your account, nobody can recover it for you.",
    changerRole: "Change role",
    seConnecter: "Sign in",
  },

  erreurs: {
    compteDesactive:
      "This account has been deactivated by the administration. To learn why, or to contest it, write to {contact}.",
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
    inscriptionEchouee: "Sign-up did not go through. Try again in a moment.",
    compteCree:
      "Account created. Open the email sent to {email} to confirm, then sign in.",
  },

  reconnaitre: {

    question: "{nom} says they are your mum or dad.",

    aide: "If you recognise them, you can say yes. If you do not, say no.",

    oui: "Yes, I recognise them",

    non: "No, I do not recognise them",

    rassurance: "Nobody will know you said no. You will not upset anyone.",

  },

  accueil: {
    bonjour: "Hello {prenom}",
    question: "What are we doing today?",
    enAttente: "Nothing to do yet.",
    enAttenteDetail:
      "Your space opens once a parent links you to their account, or once the platform switches the tutor on.",
    discuter: "Chat",
    discuterDetail: "Ask anything",
    monTuteur: "My AI tutor",
    creerTuteur: "Set up your AI tutor in 4 steps",
  },

  parent: {
    bonjour: "Hello {prenom}",
    espace: "Parent area",
    rattacher: {
      titre: "Link a child who already has an account",
      detail: "Write their login name. They will recognise you on their own screen — we will never ask you for their password.",
      exemple: "their login name",
      envoyer: "Ask",
      envoyee: "Request sent. Your child will see it next time they sign in, and they will answer.",
      nomTropCourt: "Write their login name.",
      echec: "The request could not be sent. Try again in a moment.",
    },
    trouverRepetiteur: "Find a tutor",
    compteRepetiteurs: {
      one: "{n} verified tutor so far.",
      other: "{n} verified tutors so far.",
    },
    aucunRepetiteur:
      "No verified tutor yet. The directory opens as soon as the first profiles pass the checks.",
    annuaireEtape: "Directory — step 3",
    serviceMuet:
      "Your children's list could not be loaded. Try again in a moment — the accounts are not lost.",
    creationImpossible:
      "The account could not be created: the service did not respond. Nothing was saved, you can try again.",
    ajouterEnfant: "Add a child",
    prenomEnfant: "Child's first name",
    nomEnfant: "Last name (optional)",
    motDePasseEnfant: "Child's password",
    motDePasseAide:
      "At least six characters. Your child will type it alone: pick one they will remember.",
    creerLeCompte: "Create the account",
    enfantCree:
      "Account created. {prenom} signs in with the username {identifiant} and the password you just chose.",
    lienProvisoire: "link pending",
    lienProvisoireDetail: "For forty-eight hours after recognition you only see their first name. Time enough for another adult in the family to object.",
    identifiantDe: "Username",
    aucunEnfant:
      "No child linked yet. Create an account for them: no email address needed, only a username and a password.",
    pasDEmail:
      "Your child does not need an email address. They will sign in on this phone with their username.",
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
    tuteurIndisponible: {
      surcharge: "Your tutor is very busy right now. Wait a moment and send your message again.",
      cle: "Your tutor is unavailable. Tell an adult: access to the tutor must be renewed.",
      modele: "Your tutor is unavailable. Tell an adult: a setting needs fixing.",
      autre: "Your tutor is not answering right now. Try again in a moment.",
    },
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
choisisUneMatiere: "Pick at least one subject.",
creationEchouee: "Creation failed. Try again.",
autreClasse: "Your class is not in the list?",
autreClassePlaceholder: "Write it — Year 6, First year, BTEC…",
suitLeProgramme: "official syllabus",
sansProgramme: "no syllabus",
autreMatiere: "Your subject is not in the list?",
autreMatierePlaceholder: "Write it — English, Biology…",
ajouter: "Add",
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

  adminPages: {
    tableauDeBord: {
      etiquette: "Dashboard",
      titreVide: "No verified tutor yet.",
      titreCouverture: "{ville} still has no tutor.",
      titreCalme: "Nothing is waiting for your stamp.",
      dossiersAttendent: { one: "file is waiting", other: "files are waiting" },
      ouvrirLePremier: "Open the first",
      seancesEnDirect: { one: "session live", other: "sessions live" },
      enregistrementEteint: "recording off",
      enregistrementActif: "all recorded · {resolution}",
      couverture: "Coverage",
      aucuneVille: "No town covered yet.",
      familles: { one: "family signed up", other: "families signed up" },
    },
    dossiers: {
      etiquette: "Files waiting",
      titre: { one: "One file awaits your stamp.", other: "{n} await your stamp." },
      vide: "No file waiting.",
      videDetail:
        "When a tutor submits their profile it will appear here. Nothing reaches the directory without passing through this page.",
      depose: "submitted {jours} d ago",
      deposeAujourdhui: "submitted today",
      sousLaPile: "Under the pile",
      autres: "+ {n} more",
      apposer: "Apply the stamp",
      ouvrirPieces: "Open the documents",
      plusTard: "Later",
    },
    dossier: {
      retour: "Files",
      surTotal: "File {n} of {total}",
      introuvable: "This file does not exist, or is no longer waiting.",
      pieces: "Documents",
      aucunePiece: "No document submitted.",
      requise: "required",
      facultative: "optional",
      manquante: "not submitted",
      statuts: {
        deposee: "to review",
        lisible: "readable",
        illisible: "unreadable",
        refusee: "rejected",
      },
      consulter: "View",
      telecharger: "Download",
      fermerLecteur: "Close",
      chargementPiece: "Opening…",
      pieceIllisible:
        "This document cannot be displayed here. Download it to open it.",
      pieceAbsente: "No file uploaded for this document.",
      lienTemporaire:
        "This link expires in fifteen minutes. Every viewing is recorded in the register.",
      demanderPiece: "Ask for a document",
      refuser: "Reject",
      motifRefus: "Reason for rejection",
      desactiver: "Deactivate account",
      reactiver: "Reactivate account",
      motifDesactivation: "Reason for deactivation",
      desactiveDepuis: "Account deactivated on {date}.",
      desactivationDetail:
        "The account leaves the directory and can no longer open a session; sessions already open are closed immediately. Nothing is deleted: sessions, reports and the register remain, and deactivation can be undone.",
      motifObligatoire: "A rejection without a reason means nothing to whoever receives it.",
      consigne: "Every decision is written to the log, with your name and the time.",
      tarif: "{n} FCFA / month",
      experience: { one: "{n} year of experience", other: "{n} years of experience" },
    },
    repetiteurs: {
      etiquette: "Tutors",
      chercher: "Search a name, a town, a subject…",
      fiches: { one: "{n} profile", other: "{n} profiles" },
      tous: "All",
      attente: "Waiting",
      verifies: "Verified",
      refuses: "Rejected",
      colNom: "Name",
      colVille: "Town",
      colMatieres: "Subjects",
      colPieces: "Docs",
      colEtat: "State",
      vide: "No tutor signed up yet.",
      videRecherche: "No profile matches this search.",
      retirerCachet: "Remove the stamp",
    },
    familles: {
      detailFamille: "Family",
      leParent: "Parent",
      lesEnfants: "Children",
      lesContrats: "Tutors engaged",
      aucunContrat:
        "No tutor engaged. This family has not booked any session yet.",
      aucunEnfantRattache: "No child linked to this account.",
      seancesTenues: { one: "session held", other: "sessions held" },
      depuisLe: "since {date}",
      inscritLe: "Joined on {date}",
      compteDesactiveLe: "Account deactivated on {date}",
      voirLaFamille: "Open",
      etiquette: "Families",
      chercher: "Search a family…",
      compte: { one: "{n} family", other: "{n} families" },
      enfants: { one: "{n} child", other: "{n} children" },
      aucunEnfant: "no child linked",
      seances: { one: "{n} session", other: "{n} sessions" },
      aucuneSeance: "no session",
      vide: "No family signed up yet.",
      voir: "View",
    },
    seances: {
      tenues: { one: "session", other: "sessions" },
      toutes: "All",
      seulementEnCours: "Ongoing",
      avec: "with",
      duree: "{n} min",
      enCoursDepuis: "ongoing for {n} min",
      leSeance: "On {date} at {heure}",
      ouvrirSeance: "Open",
      detailSeance: "Session",
      lesParties: "Who was there",
      leleve: "Student",
      lerepetiteur: "Tutor",
      leparent: "Parent",
      enregistrement: "Recording",
      enregistrementAbsent:
        "No recording. The module is off: nothing was lost, nothing was captured.",
      enregistrementLire: "Play recording",
      compteRendu: "Report",
      compteRenduAbsent: "No report for this session.",
      seanceIntrouvable: "This session does not exist.",
      etiquette: "Sessions",
      enCours: { one: "{n} session under way", other: "{n} sessions under way" },
      vide: "No session has taken place yet.",
      videDetail:
        "The session wall will light up when remote lessons go live. No image will be visible there — only that a session is happening and that it is recording.",
      libre: "free",
      reseauFaible: "weak network",
    },
    facturation: {
      etiquette: "Billing",
      titre: "What tutors pay you",
      modeEleve: "Amount per active student",
      modeEleveDetail: "With no student this month, a tutor owes nothing.",
      modePourcentage: "Percentage of earnings",
      modePourcentageDetail: "Requires the wallet — module off.",
      montant: "Monthly amount",
      parEleve: "FCFA / student",
      delai: "Grace period before hiding",
      jours: "days",
      portee:
        "The amount applies to everyone, without exception. After the grace period an unpaid profile leaves the directory — it is never deleted.",
      modifie: "changed · was {ancien}",
      nonEnregistre: { one: "One unsaved change", other: "{n} unsaved changes" },
      prochainCycle: "It will apply from the next billing cycle.",
      annuler: "Cancel",
      enregistrer: "Save",
      ceMois: "This month",
      attendus: "{n} F expected",
      elevesActifs: { one: "{n} student", other: "{n} students" },
      rienDu: "nothing owed",
      paye: "paid",
      jourRestants: "{n} d",
      echu: "overdue",
      videCeMois: "No charge this month.",
    },
    modules: {
      etiquette: "Modules — click to open",
      enMarche: "ON",
      eteint: "OFF",
      retour: "Modules",
      allumer: "Turn the module on",
      eteindre: "Turn the module off",
      impossibleSansCle: "Not possible without a valid key",
      cleAnthropique: "Provider key",
      nonRenseignee: "not set",
      active: "active · ••••{fin}",
      enregistrerCle: "Save",
      remplacer: "Replace",
      revoquer: "Revoke",
      jamaisRelue:
        "Encrypted in the database, never shown again in clear. You will only see its last four characters.",
modelesTitre: "Models served",
modelesDetail: "Choosing a provider sets a default. Change them if the provider renamed theirs, or if you host your own model — it carries the name you gave it.",
modeleCompte: "Served to accounts",
modeleEssai: "Served to those trying without an account",
      fournisseurTitre: "Where the tutor comes from",
      fournisseurDetail: "Context, syllabus and the pupil's memory are the same for all three. Only the required key changes. No pupil ever sees which one is used.",
      resolutionTitre: "Recording quality",
      introuvable: "This module does not exist.",
    },
    cles: {
      etiquette: "Access keys",
      intro: "Overview. Each key can also be set from its own module.",
      anthropic: "Anthropic",
      gemini: "Gemini (Google)",
      compatible: "OpenAI-compatible",
      ia_compatible: "OpenAI-compatible model",
      ia_compatible_url: "Compatible server address",
      orange: "Orange Money",
      mtn: "MTN MoMo",
      identifiantMarchand: "Merchant ID",
      carte_style: "Base map — style URL",
      carte_cle: "Base map — provider key",
      carteDetail:
        "The dashboard shows national coverage on this map. With no key, TUTELA uses MapLibre's demo tiles: enough to place the towns, not to read the streets. \u00ab {cle} \u00bb in the URL is replaced by the key below.",
      publique:
        "This key ships to every visitor's browser with the first tile. Restricting it to your domain at the provider is what protects it.",
      posee: "Saved",
      enregistrer: "Save",
      effacer: "Clear",
    },
    profil: {
      etiquette: "My account",
      titre: "Your account",
      identite: "Identity",
      prenom: "First name",
      nom: "Last name",
      telephone: "Phone",
      identifiant: "Sign-in username",
      identifiantAide:
        "This is what you type to sign in, instead of your address. Capitals and accents do not matter.",
      photo: "Photo",
      photoUrl: "Photo address",
      photoAide:
        "Uploading will come with document storage. Until then, paste the address of an image already online — or leave it empty to keep your initials.",
      enregistrer: "Save",
      enregistre: "Saved.",
      motDePasse: "Password",
      motDePasseActuel: "Current password",
      motDePasseNouveau: "New password",
      motDePasseAide:
        "At least eight characters. The current password is required: without it, anyone finding your session open could lock you out.",
      changerMotDePasse: "Change password",
      motDePasseChange: "Password changed.",
      adresse: "Sign-in address",
      adresseAide: "You can sign in with your username or with this address.",
    },
    programmes: {
      etiquette: "Official syllabus",
      titre: "{manquantes} lessons are waiting for their content.",
      intro: "The tutor receives the prerequisites, knowledge and skills of the day's lesson. Without them it knows the title and nothing else — and works blind.",
      avancement: "{faites} lessons filled out of {total}",
      publie: "Published",
      brouillon: "Draft",
      aucuneManquante: "Every lesson is filled in.",
      aucunTitre: "No syllabus loaded.",
      aucunDetail: "An official syllabus describes the lessons of a class and a subject. Without one, a pupil can only create a tutor on a subject they name themselves.",
      lecon: "Lesson",
      prerequis: "Prerequisites",
      prerequisAide: "What the pupil must already know. One per line.",
      savoirs: "Knowledge",
      savoirsAide: "The notions to know. One per line.",
      savoirFaire: "Skills",
      savoirFaireAide: "What the pupil must be able to do. One per line.",
      renseignee: "filled",
      aRemplir: "to fill",
      enregistrer: "Save this lesson",
      enregistree: "Lesson saved.",
      echec: "Saving failed.",
    },
    registre: {
      etiquette: "Log — everything is recorded",
      vide: "The log is empty.",
      videDetail:
        "Every administrative decision will be written here, with its author and time. Nothing is erased from it: the day a decision is challenged, this page is the answer.",
      ilYAMinutes: { one: "{n} minute ago", other: "{n} minutes ago" },
      hier: "yesterday",
    },
  },

  adminNav: {
    theme: "Theme",
    ouvrir: "Expand the bar",
    replier: "Collapse the bar",
    administrateur: "administrator",
    tableauDeBord: "Dashboard",
    dossiers: "Files",
    repetiteurs: "Tutors",
    familles: "Families",
    seances: "Sessions",
    programmes: "Syllabuses",
    facturation: "Billing",
    modules: "Modules",
    cles: "Keys",
    registre: "Log",
  },

  admin: {
    retour: "Back",
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
          "While it is off, the tutor setup screen does not appear and the route that calls the model refuses. Choose a provider and save its key first.",
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
      portefeuille_actif: {
        titre: "Internal wallet",
        detail:
          "Holding someone else's money falls under electronic money rules: requires a registered company and a partnership with a licensed institution.",
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
