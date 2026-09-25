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
    choisirPhoto: "Choisir une photo",
    changerPhoto: "Changer la photo",
    retirerPhoto: "Retirer",
    photoEnvoyee: "photo enregistrée",
    photoEnvoi: "Envoi…",
    photoTropGrande:
      "Cette image est trop lourde même après réduction. Essayez-en une autre.",
    photoMauvaisType:
      "Choisissez une image : JPEG, PNG ou WebP.",
    photoEchec:
      "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
    photoDifferee:
      "envoi reporté, il reprendra tout seul au retour du réseau",
    voirLaPhoto: "Voir la photo en grand",
    fermerLaPhoto: "Fermer",
    telechargerLaPhoto: "Télécharger",
    seDeconnecter: "Se déconnecter",
    quitter: "Quitter",
    enCours: "Un instant…",

    // Le bouton qui montre le mot de passe pendant qu'on le tape. En toutes
    // lettres et non en icône : l'œil, symbole habituel ailleurs, évoque au
    // Cameroun tout autre chose que la lecture d'un formulaire.
    voir: "Voir",
    cacher: "Cacher",
    voirMotDePasse: "Afficher le mot de passe",
    cacherMotDePasse: "Masquer le mot de passe",
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

  compte: {
    titre: "Ton compte",
    titreAdulte: "Votre compte",
    prenom: "Prénom",
    nom: "Nom",
    telephone: "Téléphone",
    identifiant: "Identifiant de connexion",
    identifiantFige:
      "C'est avec lui que tu te connectes. Il a été choisi à la création de ton compte et ne change pas.",
    avatar: "Choisis ton image",
    avatarAide:
      "Tu ne mets pas de photo ici. Choisis un dessin, ou garde tes initiales.",
    sansAvatar: "Mes initiales",
    enregistrer: "Enregistrer",
    enregistre: "C'est enregistré.",
    retour: "Retour",
  },

  jaugeEleve: {
    titre: "Tes séances avec le tuteur",
    detail: "La barre montre ce qu'il te reste. Elle baisse à chaque réponse du tuteur, et elle se remplit quand un adulte de ta famille recharge ton compte.",
    epuise: "Il n'y a plus de jetons pour l'instant. Demande à un adulte de ta famille de recharger ton compte.",
    etiquette: "Voir ce qu'il te reste",
    quiPaie: "Qui porte tes séances",
    enCours: "en cours",
  },

  recuperation: {
    lien: "Mot de passe oublié ?",
    titre: "Retrouver votre compte",
    sousTitre: "Nous vous enverrons un lien pour choisir un nouveau mot de passe.",
    phare: "Ça arrive.",
    email: "Votre adresse",
    envoyer: "Envoyer le lien",
    envoye: "Si un compte existe avec cette adresse, le lien vient de partir. Il ne sert qu'une fois, et il expire. Regardez aussi dans vos indésirables.",
    adresseAttendue: "Écrivez votre adresse électronique.",
    retourConnexion: "Revenir à la connexion",
    enfantLien: "Ton compte n'a pas d'adresse mail ?",
    enfantNom: "Ton nom de connexion",
    enfantDemander: "Prévenir mes parents",
    // Vraie depuis que le délai de rattachement vaut zéro (migration 053) :
    // un adulte reconnu est plein tout de suite, donc il est vraiment prévenu.
    // Si ce délai remonte un jour depuis l'espace d'administration, cette
    // phrase redeviendra fausse pour les rattachements tout neufs — c'est le
    // seul endroit à relire ce jour-là.
    enfantEnvoye:
      "Si un adulte est rattaché à ton compte, il vient d'être prévenu — par mail et dans son espace. Demande-lui de t'aider : la demande ne dure qu'un moment, et ne sert qu'une fois.",
    nomAttendu: "Écris ton nom de connexion.",
    enfantTropCourt: "Six caractères au moins.",
    enfantPose: "C'est fait. Ton enfant peut se connecter avec ce mot de passe.",
    pageTitre: "Mots de passe des enfants",
    pageDetail: "Quand un de vos enfants oublie son mot de passe, sa demande arrive ici — et par courriel. Elle ne sert qu'une fois, et son heure d'expiration est écrite sur la carte.",
    pageAucune: "Aucune demande en ce moment. Si votre enfant a oublié son mot de passe, dites-lui de cliquer sur « Mot de passe oublié ? » depuis l'écran de connexion.",
    carteFermee: "Cette demande est close : le délai a passé, ou le mot de passe a déjà été changé. Renvoyez-en une nouvelle si besoin.",
    lienDepuisAccueil: "Une demande de mot de passe vous attend",
    carteTitre: "{prenom} a oublié son mot de passe",
    carteDetail: "Choisissez-en un nouveau avec lui. Cette demande expire à {heure}.",
    carteChamp: "Nouveau mot de passe",
    renvoyerDans: "Renvoyer dans {n} s",
    renvoyer: "Renvoyer la demande",
    carteValider: "Enregistrer",
    enfantTitre: "Ton compte n'a pas d'adresse mail",
    enfantDetail: "Si un adulte est rattaché à ton compte, demande-lui de t'aider. Sinon, personne ne peut retrouver ton mot de passe — il faudra créer un nouveau compte.",
    nouveauTitre: "Choisissez un nouveau mot de passe",
    nouveauSousTitre: "Il vous connectera dès qu'il sera enregistré.",
    motDePasse: "Nouveau mot de passe",
    poser: "Enregistrer",
    change:
      "C'est fait. Vous êtes connecté, et ce mot de passe est le bon désormais.",
    changeAutresSessions:
      "Toute autre session ouverte sur votre compte vient d'être fermée : si quelqu'un y était, il en est sorti.",
    continuer: "Continuer",
    lienExpire: "Ce lien n'est plus valable. Demandez-en un nouveau.",
    echec: "Le changement n'a pas abouti. Réessayez.",
  },

  essai: {
    titre: "Essaie le tuteur, tout de suite.",
    sousTitre: "Pose-lui une question de ton programme. Il ne donne pas les réponses : il te fait chercher.",
    avertissement: "Pas de compte, pas d'adresse mail. En échange, cette conversation disparaît quand tu fermes cette page — et l'essai est court.",
    placeholder: "Écris ta question…",
    terminePlaceholder: "L'essai est terminé.",
    envoyer: "Envoyer",
    termine: "L'essai est terminé. Crée un compte pour continuer : ton tuteur se souviendra alors de ton travail d'une séance à l'autre.",
    tropDEssais: "Tu as déjà essayé plusieurs fois aujourd'hui. Crée un compte pour continuer.",
    indisponible: "Le tuteur ne répond pas pour l'instant. Réessaie dans un moment.",
    pannes: {
      surcharge: "Le tuteur est très demandé en ce moment. Attends quelques instants et renvoie ton message.",
      cle: "Le tuteur n'est pas disponible pour le moment.",
      modele: "Le tuteur n'est pas disponible pour le moment.",
      autre: "Le tuteur ne répond pas pour l'instant. Réessaie dans un moment.",
      termine: "L'essai est terminé.",
    },
    jaugeTitre: "Ton essai",
    jaugeDetail: "Cet essai est limité. La barre montre ce qu'il te reste — elle baisse à chaque réponse du tuteur. Avec un compte, tu n'auras plus cette limite, et ton tuteur se souviendra de ton travail.",
    jaugeFinie: "Ton essai est terminé. Crée un compte pour continuer.",
    jaugeEtiquette: "Voir ce qu'il reste de l'essai",
    pied: "Rien de cette conversation n'est enregistré.",
    creerUnCompte: "Créer un compte",
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
    essayerIA: "Utiliser Tutela IA",
    essayerIADetail: "sans compte — rien n'est gardé",
    seConnecter: "Se connecter",
    roles: {
      eleve: {
        titre: "Je suis un enfant",
        detail: "Réviser, être interrogé sur mon programme",
      },
      parent: {
        // « Adulte » et non « parent » : ce compte sert aussi bien à celui qui
        // cherche un répétiteur pour son enfant qu'à l'étudiant majeur qui en
        // cherche un pour lui-même. Le détail doit donc couvrir les deux, sans
        // quoi le second croit s'être trompé de bouton.
        titre: "Je suis adulte",
        detail: "Trouver un répétiteur, pour moi ou pour mon enfant",
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
      titre: "Créer ton compte",
      sousTitre: "Tu choisiras ta classe et tes matières juste après.",
      prenom: "Ton prénom",
      email: "Ton email",
      motDePasse: "Ton mot de passe",
    },
    parent: {
      phare: "Vous saurez toujours ce qui s'est passé.",
      titre: "Créer votre compte",
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
    aideMotDePasseEnfant: "6 caractères minimum. Choisis-en un que tu retiendras.",
    aideMotDePasse: "8 caractères minimum",
    valider: "Créer le compte",
    avertissementEnfant: "Tu n'as pas besoin d'adresse mail. Mais retiens bien ton mot de passe : tant qu'aucun adulte n'est rattaché à ton compte, personne ne pourra le retrouver pour toi.",
    changerRole: "Changer de rôle",
    seConnecter: "Se connecter",
  },

  erreurs: {
    compteDesactive:
      "Ce compte a été désactivé par l'administration. Pour en connaître le motif ou le contester, écrivez à {contact}.",
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
    inscriptionEchouee: "L'inscription n'a pas abouti. Réessaie dans un moment.",
    compteCree:
      "Compte créé. Ouvre l'email envoyé à {email} pour confirmer, puis connecte-toi.",
  },

  reconnaitre: {

    question: "{nom} dit être ta maman ou ton papa.",

    aide: "Si tu la reconnais, tu peux dire oui. Si tu ne la reconnais pas, dis non.",

    oui: "Oui, je la reconnais",

    non: "Non, je ne la reconnais pas",

    rassurance: "Personne ne saura que tu as dit non. Tu ne vexeras personne.",

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

    // « Adulte » et non « parent », pour la même raison qu'à l'inscription :
    // ce compte sert aussi bien à une tante, un grand frère ou un tuteur
    // légal. C'était le dernier écran à dire « parent » alors que la porte
    // d'entrée disait « adulte ».
    espace: "Espace adulte",
    rattacher: {
      titre: "Rattacher un enfant déjà inscrit",
      detail: "Écrivez son nom de connexion. C'est lui qui vous reconnaîtra sur son propre écran — nous ne vous demanderons jamais son mot de passe.",
      exemple: "son nom de connexion",
      envoyer: "Demander",
      envoyee: "Demande envoyée. Votre enfant la verra à sa prochaine connexion, et c'est lui qui répondra.",
      nomTropCourt: "Écrivez son nom de connexion.",
      echec: "La demande n'a pas pu être envoyée. Réessayez dans un moment.",
    },
    detacher: "Me détacher",
    detacherConfirme:
      "Vous ne verrez plus le travail de {nom} et vous ne pourrez plus lui reposer son mot de passe. Son compte, ses séances et son registre lui restent. Vous pourrez redemander un rattachement plus tard — c'est lui qui décidera.",
    detacherOui: "Oui, me détacher",
    detacherNon: "Annuler",
    detacherEchec:
      "Le détachement n'a pas pu se faire. Réessayez dans un moment — rien n'a changé.",
    trouverRepetiteur: "Trouver un répétiteur",
    compteRepetiteurs: {
      one: "{n} répétiteur vérifié pour l'instant.",
      other: "{n} répétiteurs vérifiés pour l'instant.",
    },
    aucunRepetiteur:
      "Aucun répétiteur vérifié pour l'instant. L'annuaire ouvrira dès que les premiers profils auront passé la vérification.",
    annuaireEtape: "Annuaire — étape 3",
    serviceMuet:
      "La liste de vos enfants n'a pas pu être chargée. Réessayez dans un instant — vos comptes ne sont pas perdus.",
    creationImpossible:
      "Le compte n'a pas pu être créé : le service n'a pas répondu. Aucun compte n'a été enregistré, vous pouvez recommencer.",
    ajouterEnfant: "Ajouter un enfant",
    prenomEnfant: "Prénom de l'enfant",
    nomEnfant: "Nom (facultatif)",
    motDePasseEnfant: "Mot de passe de l'enfant",
    motDePasseAide:
      "Six caractères au moins. Votre enfant devra le taper seul : choisissez-en un qu'il retiendra.",
    creerLeCompte: "Créer le compte",
    enfantCree:
      "Compte créé. {prenom} se connecte avec l'identifiant {identifiant} et le mot de passe que vous venez de choisir.",
    lienProvisoire: "rattachement en cours",
    lienProvisoireDetail: "Pendant quarante-huit heures après la reconnaissance, vous ne voyez que son prénom. Le temps qu'un autre adulte de la famille puisse s'y opposer.",
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
    tuteurIndisponible: {
      surcharge: "Ton tuteur est très demandé en ce moment. Attends quelques instants et renvoie ton message.",
      cle: "Ton tuteur n'est pas disponible. Préviens un adulte : l'accès au tuteur doit être renouvelé.",
      modele: "Ton tuteur n'est pas disponible. Préviens un adulte : un réglage doit être corrigé.",
      autre: "Ton tuteur ne répond pas pour l'instant. Réessaie dans un moment.",
    },
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
choisisUneMatiere: "Choisis au moins une matière.",
creationEchouee: "La création a échoué. Réessaie.",
autreClasse: "Ta classe n'est pas dans la liste ?",
autreClassePlaceholder: "Écris-la — CM2, Licence 1, BTS…",
suitLeProgramme: "programme officiel",
sansProgramme: "sans programme",
autreMatiere: "Ta matière n'est pas dans la liste ?",
autreMatierePlaceholder: "Écris-la — Anglais, SVT…",
ajouter: "Ajouter",
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
      consulter: "Consulter",
      telecharger: "Télécharger",
      fermerLecteur: "Fermer",
      chargementPiece: "Ouverture…",
      pieceIllisible:
        "Ce document ne peut pas s'afficher ici. Téléchargez-le pour l'ouvrir.",
      pieceAbsente: "Aucun fichier déposé pour cette pièce.",
      lienTemporaire:
        "Ce lien expire dans quinze minutes. Chaque consultation est consignée au registre.",
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
      detailFamille: "Famille",
      leParent: "Le parent",
      rattachements: "Tentatives de rattachement",
      rattachementsDetail: "{refusees} demandes refusées par des enfants, pour {acceptees} acceptées.",
      rattachementsAide: "Un adulte que personne n'a jamais reconnu et qui insiste ne cherche pas son enfant. Un parent que d'autres enfants ont reconnu s'est probablement trompé de nom.",
      lesEnfants: "Les enfants",
      lesContrats: "Répétiteurs engagés",
      aucunContrat:
        "Aucun répétiteur engagé. Cette famille n'a encore réservé aucune séance.",
      aucunEnfantRattache: "Aucun enfant rattaché à ce compte.",
      seancesTenues: { one: "séance tenue", other: "séances tenues" },
      depuisLe: "depuis le {date}",
      inscritLe: "Inscrit le {date}",
      compteDesactiveLe: "Compte désactivé le {date}",
      voirLaFamille: "Ouvrir",
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
      tenues: { one: "séance", other: "séances" },
      toutes: "Toutes",
      seulementEnCours: "En cours",
      avec: "avec",
      duree: "{n} min",
      enCoursDepuis: "en cours depuis {n} min",
      leSeance: "Le {date} à {heure}",
      ouvrirSeance: "Ouvrir",
      detailSeance: "Séance",
      lesParties: "Qui était là",
      leleve: "L'élève",
      lerepetiteur: "Le répétiteur",
      leparent: "Le parent",
      enregistrement: "Enregistrement",
      enregistrementAbsent:
        "Aucun enregistrement. Le module est éteint : rien n'a été perdu, rien n'a été capté.",
      enregistrementLire: "Lire l'enregistrement",
      compteRendu: "Compte rendu",
      compteRenduAbsent: "Aucun compte rendu pour cette séance.",
      seanceIntrouvable: "Cette séance n'existe pas.",
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
      delaiTitre: "Délai avant qu'un rattachement soit plein",
      delaiDetail:
        "Quand un enfant reconnaît un adulte, le lien peut attendre avant de donner ses pleins droits — de quoi laisser aux autres adultes de la famille le temps de s'y opposer. À zéro, le rattachement est immédiat : c'est le réglage actuel, parce qu'un enfant dont l'adulte est le seul rattaché n'a personne pour s'opposer, et ne pouvait plus récupérer son mot de passe pendant ce temps-là.",
      delaiHeures: "heures",
      dureeTitre: "Durée d'une demande de mot de passe",
      dureeDetail: "En minutes. C'est le temps dont dispose un adulte pour redonner un mot de passe à son enfant, depuis son espace.",
      dureeCourriel: "Le lien envoyé par courriel, lui, expire selon un réglage de Supabase — Authentication → Email → Email OTP Expiration. Sur votre propre serveur, ce sera la variable GOTRUE_MAILER_OTP_EXP, en secondes. Gardez les deux d'accord : deux canaux qui expirent à des moments différents, c'est une confusion garantie.",
      enMarche: "EN MARCHE",
      eteint: "ÉTEINT",
      retour: "Modules",
      allumer: "Allumer le module",
      eteindre: "Éteindre le module",
      impossibleSansCle: "Impossible sans clé valide",
      cleAnthropique: "Clé du fournisseur",
      nonRenseignee: "non renseignée",
      active: "active · ••••{fin}",
      enregistrerCle: "Enregistrer",
      remplacer: "Remplacer",
      revoquer: "Révoquer",
      jamaisRelue:
        "Chiffrée en base, jamais réaffichée en clair. Vous ne reverrez que ses quatre derniers caractères.",
modelesTitre: "Les modèles servis",
modelesDetail: "Choisir un fournisseur en pose un par défaut. Changez-les si le fournisseur a renommé le sien, ou si vous hébergez votre propre modèle — il porte alors le nom que vous lui avez donné.",
modeleCompte: "Servi aux comptes",
modeleEssai: "Servi à qui essaie sans compte",
      fournisseurTitre: "D'où vient le tuteur",
      fournisseurDetail: "Le contexte, le programme et la mémoire de l'élève sont les mêmes pour les trois. Seule la clé exigée change. Personne, côté élève, ne voit lequel est employé.",
      resolutionTitre: "Résolution des enregistrements",
      introuvable: "Ce module n'existe pas.",
    },
    cles: {
      etiquette: "Clés d'accès",
      intro: "Vue d'ensemble. Chaque clé se règle aussi depuis son module.",
      anthropic: "Anthropic",
      gemini: "Gemini (Google)",
      compatible: "Compatible OpenAI",
      ia_compatible: "Modèle compatible OpenAI",
      ia_compatible_url: "Adresse du serveur compatible",
      orange: "Orange Money",
      mtn: "MTN MoMo",
      identifiantMarchand: "Identifiant marchand",
      courrier_cle: "Courrier — clé du service d'envoi",
      courrier_expediteur: "Courrier — adresse d'expédition",
      courrier_expediteur_nom: "Courrier — nom affiché",
      courrierDetail:
        "Ces trois-là servent aux messages que TUTELA envoie lui-même : l'alerte à un parent quand son enfant demande un nouveau mot de passe. Les courriels d'inscription et de réinitialisation, eux, partent de Supabase et se règlent là-bas. Sans clé ici, la demande reste visible dans l'espace du parent, mais aucun courriel ne part.",
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
    profil: {
      etiquette: "Mon compte",
      titre: "Votre compte",
      identite: "Identité",
      prenom: "Prénom",
      nom: "Nom",
      telephone: "Téléphone",
      identifiant: "Identifiant de connexion",
      identifiantAide:
        "C'est ce que vous saisissez pour vous connecter, à la place de votre adresse. Les majuscules et les accents n'ont pas d'importance.",
      photo: "Photo",
      photoUrl: "Adresse de la photo",
      photoAide:
        "Le téléversement viendra avec le stockage des pièces. En attendant, collez ici l'adresse d'une image déjà en ligne — ou laissez vide pour garder vos initiales.",
      enregistrer: "Enregistrer",
      enregistre: "Enregistré.",
      motDePasse: "Mot de passe",
      motDePasseActuel: "Mot de passe actuel",
      motDePasseNouveau: "Nouveau mot de passe",
      motDePasseAide:
        "Huit caractères au moins. Le mot de passe actuel est demandé : sans lui, quelqu'un trouvant votre session ouverte pourrait vous enfermer dehors.",
      changerMotDePasse: "Changer le mot de passe",
      motDePasseChange: "Mot de passe changé.",
      adresse: "Adresse de connexion",
      adresseAide:
        "Vous pouvez vous connecter avec votre identifiant ou avec cette adresse.",
    },
    signalements: {
      etiquette: "Alertes",
      titreCalme: "Aucun signalement en attente.",
      titreAttend: { one: "Un signalement attend votre lecture.", other: "{n} signalements attendent votre lecture." },
      intro: "Un parent qui alerte sur une séance, ou la plateforme elle-même quand un adulte essuie dix refus de rattachement. Chaque signalement se classe avec sa raison.",
      aucunTitre: "Aucun signalement.",
      aucunDetail: "C'est la bonne nouvelle. Ils apparaîtront ici dès qu'un parent alertera, ou dès qu'un comportement déclenchera une alerte automatique.",
      filtreNonLues: "Non lues",
      filtreLues: "Lues",
      filtreToutes: "Toutes",
      marquerLue: "J'ai lu",
      lueLe: "Lue le {date}",
      par: "Signalé par {nom}",
      parLaPlateforme: "Signalé par la plateforme",
      vise: "Vise {nom}",
      lu: "Lue",
      nouveau: "En attente",
      traite: "Classé",
      classer: "Classer",
      decision: "Décision",
      decisionAide: "Pourquoi vous classez ainsi. Quelqu'un le relira peut-être dans six mois.",
      decisionExemple: "Vérifié avec le parent — malentendu, aucune suite.",
      decisionObligatoire: "Écrivez pourquoi vous classez ce signalement.",
      classe: "Signalement classé.",
      echec: "Le classement a échoué.",
    },
    programmes: {
      etiquette: "Programme officiel",
      titre: "{manquantes} leçons attendent leur contenu.",
      intro: "Le tuteur reçoit les prérequis, les savoirs et les savoir-faire de la leçon du jour. Sans eux, il connaît son titre et rien d'autre — et il travaille à l'aveugle.",
      avancement: "{faites} leçons renseignées sur {total}",
      publie: "Publié",
      brouillon: "Brouillon",
      aucuneManquante: "Toutes les leçons sont renseignées.",
      aucunTitre: "Aucun programme chargé.",
      aucunDetail: "Un programme officiel décrit les leçons d'une classe et d'une matière. Sans lui, un élève ne peut créer un tuteur que sur une matière qu'il nomme lui-même.",
      lecon: "Leçon",
      prerequis: "Prérequis",
      prerequisAide: "Ce que l'élève doit déjà savoir. Un par ligne.",
      savoirs: "Savoirs",
      savoirsAide: "Les notions à connaître. Une par ligne.",
      savoirFaire: "Savoir-faire",
      savoirFaireAide: "Ce que l'élève doit savoir faire. Un par ligne.",
      renseignee: "renseignée",
      aRemplir: "à remplir",
      enregistrer: "Enregistrer cette leçon",
      enregistree: "Leçon enregistrée.",
      echec: "L'enregistrement a échoué.",
    },
    actionsDuRegistre: {
      verification: "a vérifié le dossier de",
      activation: "a changé un module",
      activation_refusee_cle_manquante: "a tenté d'allumer un module sans sa clé",
      reglage: "a changé un réglage",
      signalement: "a signalé",
      signalement_lu: "a lu un signalement",
      signalement_traite: "a classé un signalement",
      desactivation: "a désactivé le compte de",
      reactivation: "a réactivé le compte de",
      programme_saisi: "a saisi le programme",
      mot_de_passe_enfant_reinitialise: "a redonné un mot de passe à",
      parLaPlateforme: "La plateforme",
      cibleAnonyme: "un compte",
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
    signalements: "Signalements",
    repetiteurs: "Répétiteurs",
    familles: "Familles",
    seances: "Séances",
    programmes: "Programmes",
    facturation: "Facturation",
    modules: "Modules",
    cles: "Clés",
    registre: "Registre",
  },

  admin: {
    retour: "Retour",
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
          "Tant qu'il est éteint, l'écran de création du tuteur n'apparaît pas et la route qui appelle le modèle refuse. Il faut d'abord choisir un fournisseur et enregistrer sa clé.",
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
