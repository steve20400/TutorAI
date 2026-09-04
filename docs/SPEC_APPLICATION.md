# Spécification de l'application

> Marché cible : **Cameroun**. Document de référence pour le développement, à faire évoluer.

---

## 1. Le principe structurant

Tu raisonnais en **modes** (1, 2, 3). Pour développer, c'est le mauvais découpage.

L'application a **trois profils d'utilisateur**, et chacun voit une application différente :

| Profil | Qui | Ce qu'il cherche |
|---|---|---|
| **Élève** | Mineur, secondaire | Réviser, être interrogé, comprendre |
| **Parent** | Le payeur, le décideur | Voir, comprendre, être rassuré |
| **Tuteur** | Prestataire adulte | Des élèves, un planning, une rémunération |

À quoi s'ajoute un **quatrième profil, hors application publique** : l'administrateur (§7).

Les trois profils publics partagent un **socle** commun et se retrouvent dans **une seule pièce** : la salle de cours.

Un compte parent peut rattacher plusieurs enfants. Un compte élève est toujours rattaché à un parent.

---

## 2. Parcours élève

### 2.1 Accueil
- **Discuter** → mode 1, assistant IA classique
- **Mon tuteur** → mode 2, tuteur personnalisé
- **Mes cours** → apparaît si le parent a activé les cours à distance

### 2.2 Création du tuteur *(une seule fois)*
1. **Pays** → Cameroun *(charge le programme officiel correspondant)*
2. **Sous-système** → francophone ou anglophone *(voir §9 — v1 francophone uniquement)*
3. **Classe** → 6e … Terminale, avec la série (A, C, D, TI…)
4. **Matières** → une matière = un tuteur
5. **Manuels** *(facultatif)* → titre, ou photo de la couverture

Récapitulatif à la validation : *« Ton tuteur de maths Terminale D connaît les N leçons de ton programme. »*

### 2.3 Séance avec le tuteur
Écran de conversation, trois boutons permanents : **micro**, **appareil photo** *(éphémère)*, **haut-parleur**.

Déroulé défini dans `TUTEUR_SYSTEM_PROMPT.md` :
1. Le tuteur demande ce qui a été fait en classe.
2. Il retrouve la leçon dans le programme officiel et la nomme.
3. Il sonde, puis interroge — **une question à la fois**.
4. Il ne donne jamais la réponse. Cinq paliers.
5. Fin de séance : résumé, points acquis, points fragiles, **une** chose à revoir.

### 2.4 Historique
Séances passées par matière et par leçon. Reprise possible.

---

## 3. Parcours parent

### 3.1 Tableau de bord
Progression par leçon du programme, comptes rendus des séances, temps de travail, points faibles récurrents.

### 3.2 Annuaire des tuteurs
Recherche par matière, niveau, tarif, disponibilité. Chaque profil affiche : identité **vérifiée** (badge), diplômes, expérience, matières, tarif, avis, vidéo de présentation.

### 3.3 Réservation et contrat
1. Le parent choisit un tuteur et un créneau.
2. Contrat généré dans l'application : matières, fréquence, tarif fixe, durée.
3. **Le règlement se fait hors application pour le moment** — voir §8.

### 3.4 Suivi et sécurité
- **Rejoindre le cours** — à tout moment, sans prévenir
- **Enregistrements** — chaque séance, consultable
- **Compte rendu automatique** après chaque cours
- **Signaler** — accessible depuis n'importe quel écran

---

## 4. Parcours tuteur

### 4.1 Inscription et vérification
Profil **invisible dans l'annuaire** tant que la vérification n'est pas complète : pièce d'identité, extrait de casier judiciaire, diplômes, références, vidéo de présentation.

### 4.2 Profil et agenda
Matières, niveaux, tarif, disponibilités, demandes entrantes.

### 4.3 Préparation de séance
Avant de lancer le cours, le tuteur choisit la **matière** et la **leçon** dans le programme officiel de l'élève. Ce choix **configure la salle** : palette de symboles, outils, ressources.

### 4.4 Suivi
Séances effectuées, historique, avis reçus.

---

## 5. La salle de cours — la pièce signature

| Zone | Contenu |
|---|---|
| **Vidéo** | Les deux participants |
| **Tableau blanc** | Partagé, sauvegardé en fin de séance |
| **Palette** | Symboles adaptés à la matière et à la leçon |
| **Photos** | Chacun dépose une photo de son cahier ou du manuel |
| **Bandeau** | *« Séance enregistrée »* — permanent, des deux côtés |
| **Chat** | Sans possibilité d'échanger un numéro ou un identifiant |

**Règles non négociables :**
- L'enregistrement démarre avec la séance et ne peut pas être désactivé.
- Le parent peut rejoindre à tout instant.
- Aucun canal tuteur ↔ élève en dehors de cette salle.

---

## 6. Le socle invisible

| Brique | Rôle |
|---|---|
| **Programme officiel** | Injecté en contexte à chaque requête (RAG). Jamais utilisé pour entraîner. |
| **Mémoire de l'élève** | Fil des séances, progression, erreurs récurrentes. Côté serveur. |
| **Couche sécurité** | Enregistrement, blocage des coordonnées, analyse des séances, signalement |

**Deux règles gravées dans l'architecture :**
1. Le contenu protégé (photos de manuels) ne fait que **transiter**. Jamais stocké, jamais mutualisé.
2. L'enregistrement de sécurité est un **coffre**, pas une ressource.

**Aucun modèle n'est entraîné.** Le modèle est appelé par API et reçoit à chaque requête : le prompt système, la leçon du programme, l'historique de l'élève, et éventuellement la photo du jour. Il ne mémorise rien.

---

## 7. L'espace d'administration

### 7.1 Architecture — une seule base, deux interfaces

**Ce n'est pas une deuxième application.** Dupliquer l'application de production pour y ajouter l'administration créerait deux bases de code qui divergeraient en quelques mois.

Le bon montage :

```
                 ┌──────────────────────┐
                 │  Base de données     │
                 │  + API  (une seule)  │
                 └──────────┬───────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
   app.<domaine>                      admin.<domaine>
   Interface publique                 Interface d'administration
   élève / parent / tuteur            accès réservé, 2FA obligatoire
```

Une seule base, une seule API, **deux interfaces déployées séparément**. L'interface d'administration a son propre domaine, sa propre authentification et une double authentification obligatoire.

Tu obtiens ce que tu voulais — tout voir, plus les outils d'administration — sans maintenir deux fois le même code.

### 7.2 Contenu de l'espace d'administration

- **Inscriptions de tuteurs** — file d'attente, examen des pièces, validation ou refus, motif consigné
- **Signalements** — file de traitement, priorisation, historique des décisions
- **Conflits** — litiges parent/tuteur, remboursements, sanctions
- **Statistiques** — élèves actifs, séances, rétention, matières demandées, revenus
- **Utilisateurs** — recherche, suspension, suppression de compte
- **Programmes** — import et mise à jour des programmes officiels
- **Contenu du tuteur IA** — édition du prompt système, consultation des contournements détectés

### 7.3 Deux règles impératives

**Toute action d'administration est journalisée.** Qui, quoi, quand, pourquoi. Sans exception.

**L'accès à un enregistrement de séance est journalisé et motivé.** Un administrateur qui peut regarder les vidéos d'enfants sans laisser de trace, c'est le point faible de toute ta promesse de sécurité. L'accès doit exiger un motif écrit, être horodaté, et rester consultable.

### 7.4 Quand le construire

Tu le prévois en dernier — d'accord pour l'ensemble. **Une exception : la file de signalements.**

Elle doit exister **dès la mise en service des tuteurs humains**. Le jour où un premier signalement arrive, tu ne peux pas répondre « l'outil n'est pas encore fait ». Un écran minimal suffit : liste, statut, décision, journal.

---

## 8. Le paiement — hors périmètre pour le moment

Décision retenue : **pas de module de paiement**. Le parent règle le tuteur directement, en dehors de l'application.

**La conséquence, à assumer en connaissance de cause :** sans paiement intégré, il n'y a pas de séquestre. Sans séquestre, rien ne retient un parent et un tuteur qui se sont trouvés sur ta plateforme d'y rester — ils continueront en direct, et tu perds à la fois la commission et la salle de cours enregistrée, donc ta promesse de sécurité.

C'est acceptable pour une phase pilote, avec des tuteurs peu nombreux et suivis de près. Ce n'est pas tenable à l'échelle. Prévois l'architecture pour l'accueillir plus tard : une table `contrat` et une table `seance` avec un statut de règlement, même si le statut est renseigné à la main au départ.

---

## 9. Le Cameroun — deux points spécifiques

**Le système est bilingue.** Deux sous-systèmes coexistent : francophone (6e → Terminale, séries A, C, D, TI ; BEPC, Probatoire, Baccalauréat) et anglophone (Form 1–5, Lower/Upper Sixth ; GCE O/A Level). Ce sont **deux programmes différents**, pas une traduction l'un de l'autre.

→ **Décision recommandée : v1 francophone uniquement.** Couvrir les deux double le travail de saisie des programmes. Mais garde la structure de données prête à accueillir le second — c'est un vrai différenciateur, personne ne sert les deux.

**Les programmes officiels ne sont pas téléchargeables.** L'arborescence du dépôt MINESEC existe (`files.minesec.gov.cm`, Enseignement général → 2nd cycle → PROGRAMME Tle → IP-SC pour les sciences) mais **tous les dossiers sont vides**, vérifié le 4 septembre 2026, dans les deux sous-systèmes.

→ C'est un obstacle réel à traiter avant la v1 : sans programme officiel, ton tuteur n'a plus d'ancrage et redevient un ChatGPT générique. Pistes dans `programme_terminale_D_maths_cm.json`.

---

## 10. Ordre de construction

| Version | Contenu | Durée estimée *(seul)* |
|---|---|---|
| **v0** | **Récupérer et structurer le programme officiel de Terminale D** | 1 semaine |
| **v1** | Compte élève, création du tuteur, séance mode 2 en **texte**, historique | 4–6 semaines |
| **v2** | Audio, photo éphémère, compte parent, tableau de bord | 3–4 semaines |
| **v3** | Annuaire tuteurs, vérification, contrat *(sans paiement)* | 5–6 semaines |
| **v4** | Salle de cours, enregistrement, comptes rendus + **file de signalements** | 6–8 semaines |
| **v5** | Analyse IA des séances, détection des signaux d'alerte | 3–4 semaines |
| **v6** | Espace d'administration complet | 3–4 semaines |

**La v0 conditionne tout le reste.** Sans le programme officiel, il n'y a pas de produit — juste un chatbot de plus.

---

## 11. Stack recommandée

| Brique | Choix | Pourquoi |
|---|---|---|
| **Application** | **PWA** (web installable), pas de natif | Une base de code, pas de store, mise à jour instantanée, légère sur Android d'entrée de gamme |
| **Front** | Next.js + Tailwind | Rapide à écrire seul, rendu mobile propre |
| **Back / base / auth / stockage** | Supabase (PostgreSQL) | Auth, base, stockage et temps réel d'un coup — le meilleur rapport vitesse/effort pour un développeur seul |
| **Modèle IA** | API Claude | Haiku pour les échanges courants, Sonnet pour les séances exigeantes. **Aucun entraînement.** |
| **Audio** *(v2)* | STT + TTS par API | À trancher après test sur accents camerounais |
| **Vidéo** *(v4)* | LiveKit | SDK web + mobile, enregistrement intégré, auto-hébergeable si les coûts dérapent |
| **Administration** *(v6)* | Même stack, déploiement séparé | Voir §7.1 |

> ⚠️ Tarifs et couverture non vérifiés. À confirmer avant tout engagement, en particulier pour la vidéo.

---

## 12. Prérequis administratifs

À lancer en parallèle du développement — ils prennent des semaines.

- Immatriculation de la société au Cameroun
- Conformité en matière de protection des données — cadre camerounais *(ANTIC, législation sur la cybersécurité et la protection des données)*. **À faire vérifier par un juriste camerounais** : le cadre applicable n'a pas été confirmé dans ce document.
- Conditions d'utilisation et politique de confidentialité rédigées par un juriste
- Procédure de signalement et contact avec les services de protection de l'enfance
- Assurance responsabilité civile professionnelle
