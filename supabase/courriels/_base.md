# Les courriels de TUTELA

Quatre choses à savoir avant de toucher à ces fichiers.

## 1. Le lien doit porter `token_hash`, pas `ConfirmationURL`

Notre route `/auth/confirm` échange elle-même le jeton contre une session
(`verifyOtp`). Elle lit `token_hash` et `type` dans l'adresse. Le
`{{ .ConfirmationURL }}` des modèles livrés par Supabase pointe vers le
serveur de Supabase et ne transporte pas ces deux valeurs : avec lui, la
personne arrive sur l'accueil et rien ne se passe, sans message d'erreur.

D'où la forme utilisée ici :

    {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery

`{{ .RedirectTo }}` est l'adresse que notre code a fournie à Supabase — elle
contient déjà `?next=/fr/...` ou `/en/...`, donc la langue du destinataire est
respectée sans que le modèle ait à la connaître.

Le `&` est correct : il y a déjà un `?` dans `RedirectTo`.

## 2. Il faut autoriser l'adresse de retour

Authentication → URL Configuration → Redirect URLs. Sans cette autorisation,
Supabase remplace silencieusement `RedirectTo` par le Site URL et le lien
mène au mauvais endroit.

    https://tutela-kappa.vercel.app/**

Et le jour du domaine propre, ajouter la nouvelle ligne AVANT de basculer.

## 3. Le logo : deux images, et pourquoi pas un SVG

La marque est une vraie image, servie depuis `public/courriel/` :

    {{ .SiteURL }}/courriel/marque-clair.png
    {{ .SiteURL }}/courriel/marque-sombre.png

`{{ .SiteURL }}` et non le domaine écrit en dur : le jour du domaine propre,
les courriels suivront tout seuls. En revanche, **Site URL doit être juste**
dans Authentication → URL Configuration, sinon les images pointent dans le
vide.

Un `<svg>` inline aurait été plus simple, mais Gmail le retire. Une seule
image aurait suffi si la marque avait une couleur unique — ce n'est pas le
cas : les deux silhouettes sont des réserves, des trous dans l'écran, et une
réserve crème sur une carte sombre donne un rectangle vide avec un point
rouge. D'où deux fichiers, et la bascule par la même règle que celle qui
assombrit la carte. Les clients qui ignorent `prefers-color-scheme` gardent
la carte claire ET le logo clair : l'ensemble reste cohérent.

Les deux PNG font 120 px pour 34 affichés, c'est-à-dire du 3&times; : les
écrans de téléphone d'aujourd'hui sont tous en haute densité.

Le `alt` est **vide**, volontairement. Le mot TUTELA est déjà écrit en texte
juste à côté ; un `alt="TUTELA"` le ferait lire deux fois par les lecteurs
d'écran, et l'afficherait deux fois chez qui bloque les images.

Les sources `.svg` restent à côté des `.png` : pour regénérer après une
retouche de `src/composants/marque.tsx`,

    rsvg-convert -w 120 -h 120 -o marque-clair.png marque-clair.svg

La pile de polices, elle, reste celle du système : une police téléchargée ne
s'affiche pas dans la moitié des clients.

## 4. Bilingue dans le même message

Le Cameroun est officiellement bilingue et Supabase n'a qu'un modèle par
type : français puis anglais dans le même courriel, séparés par un trait.
Les deux boutons mènent au même lien à usage unique — cliquer l'un ou
l'autre revient au même.

---

## Où coller quoi

Authentication → Emails → Templates

| Fichier | Modèle Supabase | `type=` |
|---|---|---|
| `confirmation-inscription.html` | Confirm signup | `email` |
| `reinitialisation-mot-de-passe.html` | Reset Password | `recovery` |
| `changement-adresse.html` | Change Email Address | `email_change` |

Les objets (champ « Subject » au-dessus du modèle) :

- Confirm signup : `Confirmez votre inscription — Confirm your sign-up`
- Reset Password : `Votre mot de passe TUTELA — Your TUTELA password`
- Change Email : `Confirmez votre nouvelle adresse — Confirm your new address`

Les modèles « Magic Link », « Invite user » et « Reauthentication » ne sont
pas utilisés par TUTELA aujourd'hui. On les laisse tels quels.
