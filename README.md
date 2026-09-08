# Tuteur IA — v1

Soutien scolaire ancré sur le programme officiel. Marché cible : **Cameroun**.

La règle centrale : **le tuteur ne donne jamais la réponse.** Il pose des
questions et corrige. Tout le reste découle de là.

📄 Documents de référence dans [`docs/`](docs/) — spec, prompt du tuteur,
guide d'entretien parent, protocole de test élèves.

---

## Démarrer

### 1. Dépendances

```bash
npm install
```

### 2. Base de données

Créer un projet sur [supabase.com](https://supabase.com), puis coller
[`supabase/schema.sql`](supabase/schema.sql) dans l'éditeur SQL et l'exécuter.

Le schéma active la **RLS sur toutes les tables**. Ce n'est pas optionnel : les
données sont celles de mineurs, et sans RLS n'importe quel jeton client lit
tout.

### 3. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Puis remplir les clés Supabase et `ANTHROPIC_API_KEY`.

⚠️ `SUPABASE_SERVICE_ROLE_KEY` contourne la RLS. Serveur uniquement, jamais
dans un composant client.

### 4. Charger un programme officiel

Insérer le contenu d'un fichier de `src/data/programmes/` dans la table
`programmes` (`publie = true`).

> **Le programme camerounais n'est pas encore saisi.**
> `cm-terminale-d-maths.json` est un squelette. Le dépôt MINESEC publie
> l'arborescence mais tous les dossiers sont vides — il faut récupérer le PDF
> autrement (Inspection Générale des Enseignements, librairie, enseignants).
> `ci-terminale-d-maths.json` est un modèle rempli, gardé comme exemple de
> mise en forme — pas comme source de contenu pour le Cameroun.

### 5. Lancer

```bash
npm run dev
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                              accueil élève (2 entrées)
│   └── api/seance/[seanceId]/message/        ← le cœur : appel au modèle
├── data/
│   ├── prompt-tuteur.md                      les règles du tuteur (source unique)
│   └── programmes/*.json                     programmes officiels
├── lib/
│   ├── anthropic.ts                          construction du contexte + appel
│   ├── programme.ts                          extraction de la leçon du jour
│   └── supabase/                             clients navigateur et serveur
└── types/db.ts
```

### Ce qui est envoyé au modèle à chaque requête

1. le prompt système — les règles du tuteur
2. la table des matières du programme officiel
3. le détail de la leçon du jour + la mémoire de l'élève
4. le fil de la conversation

**Aucun modèle n'est entraîné.** Les points 1 et 2 sont stables, donc mis en
cache (`cache_control`) : ~90 % d'économie sur le préfixe.

### Deux règles tenues par l'architecture

**Le contenu protégé ne fait que transiter.** `pageDuJour` (texte d'une photo
de manuel) est reçu par la route, transmis au modèle, puis abandonné. Aucune
table ne le reçoit — c'est vérifiable dans `supabase/schema.sql`.

**Les données de l'élève restent.** Fil de discussion, progression, erreurs
récurrentes : côté serveur, protégés par la RLS. C'est le vrai actif.

---

## Vérifier

```bash
npm run verifier
```

Enchaîne typecheck, tests et build. À lancer avant chaque push.

Les tests portent sur [`src/lib/programme.ts`](src/lib/programme.ts) — la
reconnaissance de la leçon à partir de ce que l'élève raconte. C'est la logique
qui distingue ce produit d'un assistant générique, donc celle qui mérite d'être
testée en premier. Un test vérifie notamment que le tuteur **refuse de deviner**
quand la correspondance est faible, plutôt que d'interroger sur une leçon qui
n'est pas au programme.

> Pas d'ESLint : `next lint` est déprécié et ouvre un questionnaire interactif
> qui bloque le script. Le typecheck couvre l'essentiel. À rajouter plus tard
> avec la CLI ESLint si le besoin se fait sentir.

## Décisions d'architecture

**Dépôt unique.** Il n'y a pas de backend séparé, parce qu'il n'y en a pas
besoin : en Next.js App Router, les routes `/api`, les Server Actions, les
Server Components et le middleware s'exécutent tous côté serveur. La clé
Anthropic n'atteint jamais le navigateur.

Le dépôt [TutorAI-Backend](https://github.com/steve20400/TutorAI-Backend) est
réservé à la **v4** : traitement des enregistrements de séances, analyse IA,
tâches planifiées. Ces travaux durent plusieurs minutes et ne rentrent pas dans
une fonction serverless — ils iront sur un worker (Render).

**Supabase plutôt que Neon.** Le contrôle d'accès repose sur des politiques RLS
qui appellent `auth.uid()`, une fonction de Supabase Auth. Avec Postgres seul,
il faudrait réécrire toute l'autorisation dans le code applicatif — le pire
endroit où la réimplémenter à la main pour une application qui héberge des
données de mineurs. Supabase apporte aussi le stockage sous RLS, nécessaire aux
enregistrements de la v4.

**Région Supabase : Paris (`eu-west-3`).** Le trafic ouest-africain transite par
l'Europe. ⚠️ La région ne peut pas être changée après création du projet.

## Garde-fous de coût

Chaque message part chez Anthropic et se paie.

| Garde-fou | Où | Valeur |
|---|---|---|
| Messages par élève et par heure | `src/app/api/seance/.../route.ts` | 30 |
| Longueur d'un message | idem | 4000 caractères |
| **Plafond de dépense mensuel** | **console.anthropic.com → Billing** | **à régler toi-même** |

Le compteur horaire s'appuie sur la table `messages` — pas de service
supplémentaire, et il résiste aux démarrages à froid de Vercel, ce qu'un
compteur en mémoire ne ferait pas.

## Réglages à mesurer

| Réglage | Où | Note |
|---|---|---|
| `EFFORT` | `src/lib/anthropic.ts` | `medium` par défaut. Fais une passe low/medium/high sur de vraies séances. |
| `max_tokens` | idem | 8000. La réflexion du modèle compte dans ce plafond. |

---

## Reste à faire pour la v1

- [x] Authentification (Supabase Auth + middleware de session)
- [ ] Saisir le programme camerounais de Terminale D
- [ ] Écran de création du tuteur (pays → classe → matières)
- [ ] Écran de séance (conversation)
- [ ] Historique des séances

### Note sur la confirmation par email

Supabase exige par défaut une confirmation par email à l'inscription. Pour le
test avec 10 élèves, tu peux la désactiver :
**Authentication → Sign In / Providers → Confirm email**. L'application gère
les deux cas.

Puis v2 : audio et photo. v3 : annuaire des tuteurs. v4 : salle de cours et
enregistrement. Voir [`docs/SPEC_APPLICATION.md`](docs/SPEC_APPLICATION.md) §10.
