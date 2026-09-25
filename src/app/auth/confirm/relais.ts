/**
 * La page d'un seul bouton.
 *
 * Elle est écrite à la main, en HTML, et non en React : `/auth/confirm` vit
 * hors de `app/[langue]`, où se trouvent la mise en page, les thèmes et les
 * dictionnaires. En faire une page React imposerait une mise en page racine
 * qui entrerait en conflit avec celle de `[langue]`. Pour un écran qui ne
 * contient qu'une phrase et un bouton, le détour coûterait plus que ce
 * fichier.
 *
 * Elle est bilingue comme les courriels, et pour la même raison : le Cameroun
 * l'est, et rien ici ne permet de savoir dans quelle langue la personne lit.
 *
 * Elle fonctionne sans JavaScript — c'est un formulaire, pas une application.
 */

const ECHAPPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/** Ces valeurs viennent de l'adresse : elles n'entrent jamais brutes. */
function echapper(valeur: string): string {
  return valeur.replace(/[&<>"']/g, (c) => ECHAPPE[c] ?? c)
}

export function pageDeRelais({
  token_hash,
  type,
  suite,
}: {
  token_hash: string
  type: string
  suite: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>TUTELA</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    background: #f4f1ea;
    color: #1b2a4a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .carte {
    width: 100%;
    max-width: 420px;
    background: #fbf9f4;
    border: 1px solid #dfd9cc;
    border-radius: 12px;
    padding: 32px 28px;
    text-align: center;
  }
  .marque {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.11em;
  }
  .marque img { width: 34px; height: 34px; }
  .logo-sombre { display: none; }
  h1 { margin: 0 0 10px; font-size: 21px; font-weight: 600; line-height: 1.3; }
  p { margin: 0 0 6px; font-size: 14.5px; line-height: 1.6; color: #5d6a82; }
  p.en { margin-bottom: 24px; }
  button {
    width: 100%;
    padding: 14px 24px;
    border: 0;
    border-radius: 8px;
    background: #1b2a4a;
    color: #f4f1ea;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover { opacity: 0.92; }

  @media (prefers-color-scheme: dark) {
    body { background: #0e1626; color: #e9e3d6; }
    .carte { background: #16223a; border-color: #263452; }
    p { color: #93a0b5; }
    button { background: #e9e3d6; color: #0e1626; }
    .logo-clair { display: none; }
    .logo-sombre { display: inline; }
  }
</style>
</head>
<body>
  <main class="carte">
    <span class="marque">
      <img class="logo-clair" src="/courriel/marque-clair.png" alt="">
      <img class="logo-sombre" src="/courriel/marque-sombre.png" alt="">
      TUTELA
    </span>

    <h1>Encore un clic</h1>
    <p>Appuyez sur le bouton pour continuer.</p>
    <p class="en">Press the button to continue.</p>

    <form method="post">
      <input type="hidden" name="token_hash" value="${echapper(token_hash)}">
      <input type="hidden" name="type" value="${echapper(type)}">
      <input type="hidden" name="next" value="${echapper(suite)}">
      <button type="submit">Continuer &mdash; Continue</button>
    </form>
  </main>
</body>
</html>`
}
