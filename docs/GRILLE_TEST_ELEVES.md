# Protocole et grille — Test du tuteur IA avec de vrais élèves

> Objectif : savoir si un adolescent revient voir un tuteur qui refuse de donner la réponse.
> C'est l'hypothèse dont dépend tout le produit. Durée du test : **14 jours**.

---

## 0. Avant de commencer — le consentement

Tes testeurs sont **mineurs**. Même pour un test gratuit, tu ne t'en dispenses pas — et c'est aussi un entraînement pour la suite.

Pour chaque élève, obtiens du parent un accord écrit (un message WhatsApp suffit, garde-le) précisant :

- ce que tu testes et pendant combien de temps ;
- que tu liras les conversations de son enfant, uniquement pour améliorer l'outil ;
- que rien ne sera partagé ni publié ;
- que tout sera supprimé à la fin du test ;
- que le parent peut arrêter à tout moment.

**Modèle de message :**

> « Bonjour, je développe un tuteur en mathématiques pour les élèves de Terminale D et je cherche des élèves pour le tester gratuitement pendant 2 semaines. Je lirai les conversations pour améliorer l'outil — rien ne sera partagé avec qui que ce soit, et tout sera supprimé à la fin. Vous pouvez arrêter quand vous voulez. Est-ce que vous acceptez que [prénom] participe ? »

---

## 1. Mise en place

1. Crée un Projet Claude (ou un GPT personnalisé).
2. Instructions = le contenu de `TUTEUR_SYSTEM_PROMPT.md`.
3. Document joint = `programme_terminale_D_maths_cm.json`, **une fois rempli** depuis le PDF officiel MINESEC.
4. Remplace les variables : `{{NIVEAU}}` = Terminale D, `{{PAYS}}` = Cameroun, `{{MATIERE}}` = Mathématiques.
5. Un lien par élève si possible — sinon un même lien, mais demande à chacun de commencer par « Je suis [prénom] ».

> Le test n'a pas de sens tant que le programme camerounais n'est pas saisi : c'est l'ancrage curriculaire que tu testes autant que la règle de non-réponse.

**Recrutement :** 10 élèves de Terminale D. Famille, voisinage, un enseignant qui relaie. Vise 10, tu en auras 6 d'actifs — c'est normal.

---

## 2. Ce que tu dis aux élèves — et ce que tu ne dis pas

**Tu dis :**
> « C'est un tuteur de maths sur ton programme. Utilise-le quand tu veux, autant que tu veux. C'est gratuit. Dis-moi juste franchement ce que tu en penses à la fin — même si c'est nul. »

**Tu ne dis pas :**
- que c'est toi qui l'as fait *(ils seront gentils avec toi)* ;
- qu'il ne donne pas les réponses *(laisse-les le découvrir — leur réaction est la donnée)* ;
- à quelle fréquence l'utiliser *(la fréquence spontanée est ta métrique principale)*.

**Tu n'assistes pas aux séances.** Un élève observé se comporte autrement. Tu lis les conversations après.

Ne relance personne pendant les 14 jours. Une relance fausse la mesure de rétention.

---

## 3. Les métriques

| # | Mesure | Seuil de succès | Ce que ça décide |
|---|---|---|---|
| **M1** | Élèves revenus **d'eux-mêmes** en semaine 2 | **≥ 4 / 10** | La métrique reine. En dessous, ne code pas. |
| **M2** | Séances allées jusqu'au bout *(l'élève trouve la réponse)* | ≥ 60 % | La règle accroche ou frustre |
| **M3** | Nombre moyen de séances par élève actif sur 14 jours | ≥ 3 | Usage réel ou curiosité |
| **M4** | Contournements réussis *(l'élève obtient la réponse)* | **0** | Chaque cas = une ligne à ajouter au §2 du prompt |
| **M5** | Abandons en cours de séance | ≤ 25 % | Signale un blocage mal géré |
| **M6** | Élèves déclarant être allés sur ChatGPT à la place | à noter | Ton vrai concurrent |

**M1 est la seule métrique qui décide.** Les autres t'expliquent pourquoi.

---

## 4. Dépouillement des conversations

Relis chaque conversation et code chaque incident selon cette typologie :

| Code | Incident | Ce que tu en fais |
|---|---|---|
| **C1** | Contournement réussi — l'élève a obtenu la réponse | **Critique.** Copie sa formulation exacte dans la liste des tentatives, §2 du prompt |
| **C2** | Contournement tenté et repoussé | Note la technique. Bon signe. |
| **C3** | Blocage non débloqué — le tuteur n'a pas su descendre d'un cran | Le palier 0 a échoué. Renforce §3. |
| **C4** | Abandon — l'élève arrête au milieu | Relis les 3 échanges d'avant. Frustration ou lassitude ? |
| **C5** | Erreur mathématique du tuteur | **Critique.** Un tuteur qui se trompe est pire que pas de tuteur. |
| **C6** | Sortie du programme | L'ancrage a lâché |
| **C7** | Manuel recopié mot pour mot | Risque juridique. Renforce §6. |
| **C8** | Ton inadapté — condescendant, sec, ou flatterie creuse | Ajuste §8 |
| **C9** | Le tuteur a donné la réponse **sans qu'on la lui demande** | Critique. La règle a lâché seule. |
| **C10** | Moment où ça a visiblement marché | Garde-le. C'est ta démo et ton argument de vente. |

Tiens un simple tableau : `date | élève | code | citation exacte | correction à apporter`.

---

## 5. Fiche par élève — à remplir à J+14

```
Élève n°           :        Prénom :
Accord parental    : oui / non          Date :

Séances totales    :
Dernière séance    : J+
Revenu en semaine 2 sans relance ?   OUI / NON        ← M1

Séances terminées  :      /
Abandons           :

Incidents relevés  : C1___ C2___ C3___ C4___ C5___
                     C6___ C7___ C8___ C9___ C10___

Sa meilleure tentative de contournement (mot pour mot) :

Le moment où ça a le mieux marché :

VERDICT ÉLÈVE (5 questions à lui poser à la fin, sans le guider) :
 1. Tu l'as trouvé comment ?
 2. Qu'est-ce qui t'a énervé ?
 3. Tu l'as utilisé combien de fois environ ?
 4. Tu es allé sur ChatGPT à la place, à un moment ?
 5. Tu continuerais à l'utiliser l'an prochain ?

Ses mots exacts sur ce qui l'a énervé :
```

---

## 6. La décision à J+14

| M1 (retour spontané) | Décision |
|---|---|
| **≥ 6 / 10** | Signal fort. Tu construis le mode 2 en application réelle. |
| **4–5 / 10** | Correct. Corrige les C1 et C3, refais un test de 2 semaines avec 10 nouveaux élèves. |
| **2–3 / 10** | La règle stricte frustre. Assouplis le palier 0 — plus de décomposition, des sous-questions plus petites — et refais le test. |
| **0–1 / 10** | Arrête le mode 2 comme produit principal. Reporte tes efforts sur le mode 3, où le payeur est le parent et où la valeur ne dépend pas de l'envie de l'élève. |

**Ne triche pas avec ce tableau.** Tu vas avoir envie de trouver des excuses aux mauvais chiffres — mauvaise période, élèves pas motivés, connexion. C'est exactement pour ça que tu écris le seuil **avant** de mesurer.

---

## 7. À la fin

- Supprime les conversations et les données des élèves, comme annoncé aux parents.
- Garde uniquement : les incidents anonymisés, les citations sans prénom, et tes chiffres.
- Remercie les élèves et les parents, et dis-leur ce que tu as appris. Ce sont tes premiers utilisateurs — certains deviendront tes premiers clients.
