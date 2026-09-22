/**
 * Textes français — la langue de référence.
 *
 * `en.ts` est typé d'après ce fichier : ajouter une clé ici fait échouer la
 * compilation tant que la traduction anglaise n'est pas écrite. C'est
 * volontaire — au Cameroun, une interface à moitié traduite laisse les régions
 * anglophones devant des phrases qu'elles ne comprennent pas, sur une
 * application qui parle de la sécurité de leurs enfants.
 */
export const fr = {
  meta: {
    nom: "Français",
    nomCourt: "FR",
    htmlLang: "fr",
    titre: "TUTELA",
    description:
      "Un répétiteur vérifié. Une séance qui laisse une trace. Le soutien scolaire où un enfant n'est jamais seul avec un adulte.",
  },

  commun: {
    seDeconnecter: "Se déconnecter",
    quitter: "Quitter",
    enCours: "Un instant…",
    affichageClair: "Passer en affichage clair",
    affichageSombre: "Passer en affichage sombre",
    changerAffichage: "Changer l'affichage",
    changerLangue: "Changer de langue",
  },

  introuvable: {
    titre: "Cette page n'existe pas.",
    detail:
      "L'adresse est peut-être mal recopiée, ou la page a changé de nom depuis qu'on vous a partagé le lien.",
    retour: "Revenir à l'accueil",
    code: "Erreur 404",
  },

  chargement: {
    aria: "Chargement de TUTELA",
    sloganLigne1: "Un répétiteur vérifié.",
    sloganLigne2: "Une séance qui laisse une trace.",
    lent: "Connexion lente — on continue.",
  },

  promesses: [
    {
      mot: "Vérifiés",
      detail: "Pièce d'identité et casier contrôlés avant la première séance.",
    },
    {
      mot: "Enregistrés",
      detail: "Chaque cours laisse une trace, que le parent peut consulter.",
    },
    {
      mot: "Suivis",
      detail: "Le travail de l'enfant se lit, séance après séance.",
    },
  ],

  connexion: {
    etiquette: "Connexion",
    phare: "Content de te revoir.",
    titre: "Bon retour.",
    sousTitre: "Élève, parent ou répétiteur — même porte d'entrée.",
    email: "Email ou identifiant",
    motDePasse: "Mot de passe",
    valider: "Se connecter",
    pasDeCompte: "Pas encore de compte ?",
    creerCompte: "Créer un compte",
  },

  inscription: {
    etiquette: "Inscription",
    phare: "Commençons.",
    titre: "Créer un compte",
    sousTitre: "Pour commencer, tu es…",
    dejaCompte: "Tu as déjà un compte ?",
    seConnecter: "Se connecter",
    roles: {
      eleve: {
        titre: "Je suis élève",
        detail: "Réviser, être interrogé sur mon programme",
      },
      parent: {
        titre: "Je suis parent",
        detail: "Suivre mon enfant, trouver un répétiteur de confiance",
      },
      repetiteur: {
        titre: "Je suis répétiteur",
        detail: "Donner des cours à distance, trouver des élèves",
      },
    },
  },

  inscriptionRole: {
    eleve: {
      phare: "Bienvenue.",
      titre: "Créer ton compte élève",
      sousTitre: "Tu choisiras ta classe et tes matières juste après.",
      prenom: "Ton prénom",
      email: "Ton email",
      motDePasse: "Ton mot de passe",
    },
    parent: {
      phare: "Vous saurez toujours ce qui s'est passé.",
      titre: "Créer votre compte parent",
      sousTitre:
        "Vous pourrez ensuite rattacher vos enfants et consulter leur suivi.",
      prenom: "Votre prénom",
      email: "Votre email",
      motDePasse: "Votre mot de passe",
    },
    repetiteur: {
      phare: "Votre sérieux, prouvé.",
      titre: "Créer votre compte répétiteur",
      sousTitre:
        "Votre profil ne sera visible des familles qu'une fois la vérification faite.",
      prenom: "Votre prénom",
      email: "Votre email",
      motDePasse: "Votre mot de passe",
    },
    nom: "Votre nom",
    telephone: "Votre téléphone",
    aideTelephone:
      "Utilisé par l'équipe pour la vérification, jamais affiché aux familles",
    aideMotDePasse: "8 caractères minimum",
    valider: "Créer le compte",
    changerRole: "Changer de rôle",
    seConnecter: "Se connecter",
  },

  erreurs: {
    compteDesactive:
      "Ce compte a été désactivé par l'administration. Écrivez-nous si vous pensez qu'il s'agit d'une erreur.",
    identifiantsIncorrects: "Email ou mot de passe incorrect.",
    emailNonConfirme:
      "Ton email n'est pas encore confirmé. Vérifie ta boîte de réception.",
    compteExistant: "Un compte existe déjà avec cet email. Connecte-toi.",
    motDePasseCourt: "Le mot de passe est trop court.",
    tropDeTentatives: "Trop de tentatives. Réessaie dans quelques minutes.",
    generique: "Une erreur est survenue. Réessaie.",
    champsVides: "Remplis les deux champs.",
    roleManquant: "Choisis d'abord si tu es élève, parent ou répétiteur.",
    prenomManquant: "Il me faut un prénom.",
    emailManquant: "Il me faut un email.",
    motDePasseTropCourt: "Le mot de passe doit faire au moins 8 caractères.",
    compteCree:
      "Compte créé. Ouvre l'email envoyé à {email} pour confirmer, puis connecte-toi.",
  },

  accueil: {
    bonjour: "Bonjour {prenom}",
    question: "Qu'est-ce qu'on fait aujourd'hui ?",
    enAttente: "Rien à faire pour l'instant.",
    enAttenteDetail:
      "Ton espace s'ouvrira quand un parent t'aura rattaché à son compte, ou quand la plateforme activera le tuteur.",
    discuter: "Discuter",
    discuterDetail: "Poser une question libre",
    monTuteur: "Mon tuteur",
    creerTuteur: "Créer ton tuteur en 4 étapes",
  },

  parent: {
    bonjour: "Bonjour {prenom}",
    espace: "Espace parent",
    trouverRepetiteur: "Trouver un répétiteur",
    compteRepetiteurs: {
      one: "{n} répétiteur vérifié pour l'instant.",
      other: "{n} répétiteurs vérifiés pour l'instant.",
    },
    aucunRepetiteur:
      "Aucun répétiteur vérifié pour l'instant. L'annuaire ouvrira dès que les premiers profils auront passé la vérification.",
    annuaireEtape: "Annuaire — étape 3",
    ajouterEnfant: "Ajouter un enfant",
    prenomEnfant: "Prénom de l'enfant",
    nomEnfant: "Nom (facultatif)",
    motDePasseEnfant: "Mot de passe de l'enfant",
    motDePasseAide:
      "Six caractères au moins. Votre enfant devra le taper seul : choisissez-en un qu'il retiendra.",
    creerLeCompte: "Créer le compte",
    enfantCree:
      "Compte créé. {prenom} se connecte avec l'identifiant {identifiant} et le mot de passe que vous venez de choisir.",
    identifiantDe: "Identifiant",
    aucunEnfant:
      "Aucun enfant rattaché pour l'instant. Créez-lui un compte : il n'a pas besoin d'adresse mail, seulement d'un identifiant et d'un mot de passe.",
    pasDEmail:
      "Votre enfant n'a pas besoin d'adresse mail. Il se connectera sur ce téléphone avec son identifiant.",
    mesEnfants: "Mes enfants",
    mesEnfantsDetail:
      "Rattacher un enfant à votre compte vous donnera accès à son suivi : progression, comptes rendus de séance, enregistrements des cours.",
    suiviEtape: "Suivi — étape 4",
  },

  repetiteurProfil: {
    titre: "Mon profil",
    statuts: {
      brouillon: {
        titre: "Profil non soumis",
        detail:
          "Complétez votre profil puis soumettez-le. Tant qu'il n'est pas vérifié, aucune famille ne peut le voir.",
      },
      en_attente: {
        titre: "Vérification en cours",
        detail:
          "Notre équipe examine vos pièces. Vous serez prévenu dès que c'est terminé.",
      },
      verifie: {
        titre: "Profil vérifié",
        detail: "Votre profil est visible des familles dans l'annuaire.",
      },
      refuse: {
        titre: "Profil refusé",
        detail:
          "Consultez le motif ci-dessous, corrigez, puis soumettez à nouveau.",
      },
    },
  },

  /**
   * Étiquettes d'affichage des listes fermées.
   *
   * Les clés sont les valeurs réellement stockées en base — elles restent en
   * français et ne doivent jamais être traduites, sous peine de couper les
   * fiches existantes de l'annuaire.
   */
  matieres: {
    Mathématiques: "Mathématiques",
    "Physique-Chimie": "Physique-Chimie",
    SVT: "SVT",
    Français: "Français",
    Anglais: "Anglais",
    Philosophie: "Philosophie",
    "Histoire-Géographie": "Histoire-Géographie",
    Informatique: "Informatique",
    Économie: "Économie",
  } as Record<string, string>,

  /**
   * Les niveaux ne se traduisent pas, ils se correspondent : le sous-système
   * anglophone camerounais a ses propres classes. On affiche l'équivalent
   * le plus proche, la valeur stockée ne change pas.
   */
  niveaux: {
    "6e": "6e",
    "5e": "5e",
    "4e": "4e",
    "3e": "3e",
    "2nde": "2nde",
    "1ère": "1ère",
    Terminale: "Terminale",
  } as Record<string, string>,

  repetiteurFormulaire: {
    ceQueVousEnseignez: "Ce que vous enseignez",
    aQuelsNiveaux: "À quels niveaux",
    vousPresenter: "Vous présenter",
    quelquesLignes: "Quelques lignes",
    bioPlaceholder:
      "Votre parcours, votre façon de travailler avec un élève…",
    bioAide: "C'est souvent le seul texte qu'un parent lit en entier.",
    ville: "Ville",
    villePlaceholder: "Yaoundé",
    conditions: "Conditions",
    tarif: "Tarif mensuel (FCFA)",
    experience: "Années d'expérience",
    disponibilites: "Disponibilités",
    disponibilitesPlaceholder: "En semaine après 17h, samedi matin",
    enregistrer: "Enregistrer",
    enregistrement: "Enregistrement…",
    pieces:
      "L'envoi des pièces justificatives — identité, casier judiciaire, diplômes — viendra à l'étape suivante.",
  },

  tuteur: {
    mesTuteurs: "Mes tuteurs",
    accueil: "Accueil",
    ajouterMatiere: "Ajouter une matière",
    retour: "Retour",
    reprendre: "Reprendre la séance en cours",
    commencer: "Commencer une séance",
    seancesPassees: "Séances passées",
    aucuneSeance: "Aucune séance pour l'instant. Ton tuteur t'attend.",
    leconNonIdentifiee: "Leçon pas encore identifiée",
    aucunProgrammeTitre: "Aucun programme disponible",
    aucunProgrammeDetail:
      "Aucun programme officiel n'est encore chargé dans la base. Un tuteur ne peut pas être créé tant que ce n'est pas fait.",
    revenirAccueil: "Revenir à l'accueil",
    creerTitre: "Créer ton tuteur",
    quelPays: "Tu es dans quel pays ?",
    quelSysteme: "Tu suis quel système ?",
    francophone: "Francophone",
    anglophone: "Anglophone",
    quelleClasse: "Tu es en quelle classe ?",
    quellesMatieres: "Quelles matières ?",
    aideMatieres: "Une matière = un tuteur. Tu peux en choisir plusieurs.",
    manuels: "Tes manuels (facultatif)",
    aideManuels:
      "Un titre par ligne. Ça aide ton tuteur à suivre la progression de ta classe. Tu peux passer cette étape.",
    etapeSur: "Étape {n} sur {total}",
    continuer: "Continuer",
    recapitulatif: "Récapitulatif",
    creation: "Création…",
    creerMonTuteur: "Créer mon tuteur",
    pays: { CM: "Cameroun", CI: "Côte d'Ivoire" } as Record<string, string>,
  },

  seance: {
    ecrisTaReponse: "Écris ta réponse…",
    envoyer: "Envoyer",
    envoiEchoue: "L'envoi a échoué. Réessaie.",
    pasDeConnexion: "Pas de connexion. Vérifie ton réseau et réessaie.",
  },

  adminPages: {
    tableauDeBord: {
      etiquette: "Tableau de bord",
      titreVide: "Aucun répétiteur vérifié pour l'instant.",
      titreCouverture: "{ville} n'a toujours aucun répétiteur.",
      titreCalme: "Rien n'attend votre cachet.",
      dossiersAttendent: { one: "dossier attend", other: "dossiers attendent" },
      ouvrirLePremier: "Ouvrir le premier",
      seancesEnDirect: { one: "séance en direct", other: "séances en direct" },
      enregistrementEteint: "enregistrement éteint",
      enregistrementActif: "toutes enregistrées · {resolution}",
      couverture: "Couverture",
      aucuneVille: "Aucune ville couverte pour l'instant.",
      familles: { one: "famille inscrite", other: "familles inscrites" },
    },
    dossiers: {
      etiquette: "Dossiers en attente",
      titre: { one: "Un dossier attend votre cachet.", other: "{n} attendent votre cachet." },
      vide: "Aucun dossier en attente.",
      videDetail:
        "Quand un répétiteur soumettra sa fiche, elle apparaîtra ici. Rien ne passe dans l'annuaire sans être passé par cette page.",
      depose: "déposé il y a {jours} j",
      deposeAujourdhui: "déposé aujourd'hui",
      sousLaPile: "Sous la pile",
      autres: "+ {n} autres",
      apposer: "Apposer le cachet",
      ouvrirPieces: "Ouvrir les pièces",
      plusTard: "Plus tard",
    },
    dossier: {
      retour: "Dossiers",
      surTotal: "Dossier {n} sur {total}",
      introuvable: "Ce dossier n'existe pas ou n'est plus en attente.",
      pieces: "Pièces",
      aucunePiece: "Aucune pièce déposée.",
      requise: "requise",
      facultative: "facultative",
      manquante: "non déposée",
      statuts: {
        deposee: "à examiner",
        lisible: "lisible",
        illisible: "illisible",
        refusee: "refusée",
      },
      demanderPiece: "Demander une pièce",
      refuser: "Refuser",
      motifRefus: "Motif du refus",
      desactiver: "Désactiver le compte",
      reactiver: "Réactiver le compte",
      motifDesactivation: "Motif de la désactivation",
      desactiveDepuis: "Compte désactivé le {date}.",
      desactivationDetail:
        "Le compte sort de l'annuaire et ne peut plus ouvrir de session ; les sessions en cours sont fermées immédiatement. Rien n'est supprimé : les séances, les comptes rendus et le registre subsistent, et la désactivation se défait.",
      motifObligatoire: "Un refus sans motif est incompréhensible pour celui qui le reçoit.",
      consigne: "Chaque décision est inscrite au registre, avec votre nom et l'heure.",
      tarif: "{n} FCFA / mois",
      experience: { one: "{n} an d'expérience", other: "{n} ans d'expérience" },
    },
    repetiteurs: {
      etiquette: "Répétiteurs",
      chercher: "Chercher un nom, une ville, une matière…",
      fiches: { one: "{n} fiche", other: "{n} fiches" },
      tous: "Tous",
      attente: "En attente",
      verifies: "Vérifiés",
      refuses: "Refusés",
      colNom: "Nom",
      colVille: "Ville",
      colMatieres: "Matières",
      colPieces: "Pièces",
      colEtat: "État",
      vide: "Aucun répétiteur inscrit pour l'instant.",
      videRecherche: "Aucune fiche ne correspond à cette recherche.",
      retirerCachet: "Retirer le cachet",
    },
    familles: {
      etiquette: "Familles",
      chercher: "Chercher une famille…",
      compte: { one: "{n} famille", other: "{n} familles" },
      enfants: { one: "{n} enfant", other: "{n} enfants" },
      aucunEnfant: "aucun enfant rattaché",
      seances: { one: "{n} séance", other: "{n} séances" },
      aucuneSeance: "aucune séance",
      vide: "Aucune famille inscrite pour l'instant.",
      voir: "Voir",
    },
    seances: {
      etiquette: "Séances",
      enCours: { one: "{n} séance en cours", other: "{n} séances en cours" },
      vide: "Aucune séance n'a encore eu lieu.",
      videDetail:
        "Le mur des séances s'allumera quand les cours à distance seront en service. Aucune image n'y sera visible — seulement qu'une séance a lieu et qu'elle enregistre.",
      libre: "libre",
      reseauFaible: "réseau faible",
    },
    facturation: {
      etiquette: "Facturation",
      titre: "Ce que les répétiteurs vous versent",
      modeEleve: "Montant par élève actif",
      modeEleveDetail: "Sans élève ce mois-ci, le répétiteur ne doit rien.",
      modePourcentage: "Pourcentage des gains",
      modePourcentageDetail: "Exige le porte-monnaie — module éteint.",
      montant: "Montant mensuel",
      parEleve: "FCFA / élève",
      delai: "Délai avant masquage",
      jours: "jours",
      portee:
        "Le montant s'applique à tous, sans exception. Passé le délai, la fiche impayée est retirée de l'annuaire — elle n'est jamais supprimée.",
      modifie: "modifié · était {ancien}",
      nonEnregistre: { one: "Une modification non enregistrée", other: "{n} modifications non enregistrées" },
      prochainCycle: "Elle s'appliquera au prochain cycle de facturation.",
      annuler: "Annuler",
      enregistrer: "Enregistrer",
      ceMois: "Ce mois-ci",
      attendus: "{n} F attendus",
      elevesActifs: { one: "{n} élève", other: "{n} élèves" },
      rienDu: "rien dû",
      paye: "payé",
      jourRestants: "{n} j",
      echu: "échu",
      videCeMois: "Aucune redevance ce mois-ci.",
    },
    modules: {
      etiquette: "Modules — cliquez pour ouvrir",
      enMarche: "EN MARCHE",
      eteint: "ÉTEINT",
      retour: "Modules",
      allumer: "Allumer le module",
      eteindre: "Éteindre le module",
      impossibleSansCle: "Impossible sans clé valide",
      cleAnthropique: "Clé Anthropic",
      nonRenseignee: "non renseignée",
      active: "active · ••••{fin}",
      enregistrerCle: "Enregistrer",
      remplacer: "Remplacer",
      revoquer: "Révoquer",
      jamaisRelue:
        "Chiffrée en base, jamais réaffichée en clair. Vous ne reverrez que ses quatre derniers caractères.",
      resolutionTitre: "Résolution des enregistrements",
      introuvable: "Ce module n'existe pas.",
    },
    cles: {
      etiquette: "Clés d'accès",
      intro: "Vue d'ensemble. Chaque clé se règle aussi depuis son module.",
      anthropic: "Anthropic",
      orange: "Orange Money",
      mtn: "MTN MoMo",
      identifiantMarchand: "Identifiant marchand",
      carte_style: "Fond de carte — adresse du style",
      carte_cle: "Fond de carte — clé du fournisseur",
      carteDetail:
        "Le tableau de bord affiche la couverture du pays sur cette carte. Sans clé, TUTELA utilise les tuiles de démonstration de MapLibre : elles suffisent à situer les villes, pas à lire les rues. « {cle} » dans l'adresse est remplacé par la clé ci-dessous.",
      publique:
        "Cette clé part dans le navigateur de chaque visiteur avec la première tuile. La restreindre à votre domaine chez le fournisseur est ce qui la protège.",
      posee: "Enregistrée",
      enregistrer: "Enregistrer",
      effacer: "Effacer",
    },
    registre: {
      etiquette: "Registre — tout est consigné",
      vide: "Le registre est vide.",
      videDetail:
        "Chaque décision d'administration s'y inscrira, avec son auteur et son heure. Rien ne s'en efface : le jour où une décision est contestée, c'est cette page qui répond.",
      ilYAMinutes: { one: "il y a {n} minute", other: "il y a {n} minutes" },
      hier: "hier",
    },
  },

  adminNav: {
    theme: "Thème",
    ouvrir: "Déplier la barre",
    replier: "Replier la barre",
    administrateur: "administrateur",
    tableauDeBord: "Tableau de bord",
    dossiers: "Dossiers",
    repetiteurs: "Répétiteurs",
    familles: "Familles",
    seances: "Séances",
    facturation: "Facturation",
    modules: "Modules",
    cles: "Clés",
    registre: "Registre",
  },

  admin: {
    titre: "Administration",
    eleves: "Élèves",
    parents: "Parents",
    repetiteurs: "Répétiteurs",
    aVerifier: "À vérifier",
    modules: "Modules",
    actif: "Actif",
    eteint: "Éteint",
    activer: "Activer",
    eteindre: "Éteindre",
    interrupteurs: {
      ia_active: {
        titre: "Tuteur IA",
        detail:
          "Tant qu'il est éteint, l'écran de création du tuteur n'apparaît pas et la route qui appelle le modèle refuse. Nécessite une clé Anthropic.",
      },
      enregistrement_actif: {
        titre: "Enregistrement des séances",
        detail:
          "Éteins-le en développement pour ne pas consommer de stockage. En production il doit rester allumé : c'est la promesse faite aux parents.",
      },
      paiement_actif: {
        titre: "Paiement mobile money",
        detail:
          "Orange Money et MTN MoMo. Nécessite les clés d'API d'un agrégateur.",
      },
      portefeuille_actif: {
        titre: "Porte-monnaie interne",
        detail:
          "Détenir l'argent d'un tiers relève de la monnaie électronique : exige une société constituée et un partenariat avec un établissement agréé.",
      },
      inscriptions_ouvertes: {
        titre: "Nouvelles inscriptions",
        detail:
          "Ferme la porte sans couper l'application pour ceux qui ont déjà un compte.",
      },
    },
    avertissementEnregistrement:
      "⚠ Aucune séance n'est enregistrée tant que c'est éteint.",
    resolutionTitre: "Résolution des enregistrements",
    resolutionDetail:
      "Un enregistrement de sécurité doit être lisible, pas beau. Plus la résolution est basse, moins il coûte en stockage — et mieux il passe sur les réseaux de tes utilisateurs.",
    resolutionCout: "≈ {taille} par heure de cours.",
    journal:
      "Chaque changement est inscrit au journal d'administration, avec son auteur et son horodatage.",
  },
}

export type Dictionnaire = typeof fr
