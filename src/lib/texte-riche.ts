/**
 * Ce que le tuteur écrit, rendu comme dans un cahier.
 *
 * ── LE PROBLÈME, VU À L'ÉCRAN ──
 *
 * Un modèle écrit en Markdown : `**important**`, des listes à tirets, des
 * titres. Rendus bruts, ils s'affichent avec leurs étoiles — un élève lit
 * « **important** » et se demande ce que les étoiles veulent dire. Il écrit
 * aussi `->`, `<=`, `x^2` : des conventions de clavier que personne n'a
 * jamais vues au tableau.
 *
 * ── LA RÈGLE, ET ELLE N'EST PAS NÉGOCIABLE ──
 *
 * Un enfant du primaire doit reconnaître CE QU'IL VOIT À L'ÉCOLE. Si on lui
 * montre `<=` il doit d'abord apprendre une correspondance avant d'apprendre
 * la leçon pour laquelle il est venu. Le symbole s'écrit donc ≤, la flèche →,
 * le carré ². C'est une règle de pédagogie avant d'être une règle d'affichage.
 *
 * ── CE QU'ON NE TOUCHE PAS ──
 *
 * Les formules LaTeX sont découpées AVANT par `texte-mathematique.tsx` et ne
 * passent jamais ici : KaTeX les rend bien mieux. Le code entre accents
 * graves est laissé tel quel — quand un élève demande comment on écrit
 * quelque chose, la réponse est ce qu'il doit taper, pas sa jolie version.
 *
 * Et `3 * 4` devient `3 × 4` tandis que `*important*` devient de l'italique :
 * c'est l'espace après l'étoile qui tranche, comme en Markdown. Sans cette
 * distinction, une multiplication passerait en italique et disparaîtrait.
 */

export type Inline =
  | { t: "mot"; v: string }
  | { t: "gras"; v: string }
  | { t: "italique"; v: string }
  | { t: "code"; v: string }

export type Ligne =
  | { t: "paragraphe"; contenu: Inline[] }
  | { t: "puce"; contenu: Inline[] }
  | { t: "numero"; n: string; contenu: Inline[] }
  | { t: "titre"; contenu: Inline[] }
  | { t: "vide" }

/**
 * Les correspondances de clavier, remplacées par les vrais signes.
 *
 * Chacune est sûre dans du texte ordinaire : aucune ne peut se déclencher sur
 * un mot français. Ce qui est ambigu n'est pas dans la liste — `1/2` reste
 * `1/2`, parce qu'une date du 1/2 existe aussi, et `pi` reste `pi`, parce que
 * le mot se promène dans trop de mots.
 */
const SIGNES: [RegExp, string][] = [
  [/<-->|<->/g, "↔"],
  [/-->|->/g, "→"],
  [/<--|<-/g, "←"],
  [/=>/g, "⇒"],
  [/<=/g, "≤"],
  [/>=/g, "≥"],
  [/!=|\/=/g, "≠"],
  [/\+\/-|\+-/g, "±"],
  [/\.\.\./g, "…"],
  [/\bsqrt\s*\(/g, "√("],
  // Le carré et le cube, écrits comme au tableau. Seulement collés à un
  // caractère : `2^10` garde sa forme, qui n'a pas d'exposant typographique.
  [/(\w)\^2(?![0-9])/g, "$1²"],
  [/(\w)\^3(?![0-9])/g, "$1³"],
  // La multiplication entre deux nombres. Avec des espaces autour de
  // l'étoile, donc jamais confondue avec de l'italique.
  [/(\d)\s\*\s(\d)/g, "$1 × $2"],
]

/** Remplace les correspondances de clavier par les signes de l'école. */
export function signes(texte: string): string {
  let s = texte
  for (const [motif, signe] of SIGNES) s = s.replace(motif, signe)
  return s
}

/**
 * Découpe une ligne en gras, italique, code et texte ordinaire.
 *
 * Volontairement court. On ne rend pas le Markdown entier — ni les liens, ni
 * les tableaux, ni les images : un tuteur qui en produirait signalerait un
 * problème d'invite, pas un manque d'affichage.
 */
export function inline(ligne: string): Inline[] {
  const sortie: Inline[] = []
  // L'ordre compte : le code d'abord, pour qu'une étoile à l'intérieur ne
  // soit pas lue comme du gras. Puis le double avant le simple.
  const motif = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*(?!\s)[^*]*[^\s*]\*|_(?!\s)[^_]*[^\s_]_)/g

  let dernier = 0
  for (const trouve of ligne.matchAll(motif)) {
    const debut = trouve.index ?? 0
    if (debut > dernier) {
      sortie.push({ t: "mot", v: signes(ligne.slice(dernier, debut)) })
    }
    const brut = trouve[0]
    if (brut.startsWith("`")) {
      // Jamais de signes dans du code : on y montre ce qu'il faut taper.
      sortie.push({ t: "code", v: brut.slice(1, -1) })
    } else if (brut.startsWith("**") || brut.startsWith("__")) {
      sortie.push({ t: "gras", v: signes(brut.slice(2, -2)) })
    } else {
      sortie.push({ t: "italique", v: signes(brut.slice(1, -1)) })
    }
    dernier = debut + brut.length
  }

  if (dernier < ligne.length) {
    sortie.push({ t: "mot", v: signes(ligne.slice(dernier)) })
  }
  return sortie
}

/**
 * Découpe un bloc de texte en lignes typées.
 *
 * Les listes comptent plus qu'il n'y paraît : « voici les trois étapes »
 * suivi d'un paragraphe compact se lit mal à treize ans. Alignées sous leurs
 * puces, les étapes se comptent du regard.
 */
export function enLignes(texte: string): Ligne[] {
  return texte.split("\n").map((brute): Ligne => {
    const l = brute.trim()
    if (l === "") return { t: "vide" }

    const titre = /^#{1,6}\s+(.*)$/.exec(l)
    if (titre) return { t: "titre", contenu: inline(titre[1] ?? "") }

    const puce = /^[-*•]\s+(.*)$/.exec(l)
    if (puce) return { t: "puce", contenu: inline(puce[1] ?? "") }

    const numero = /^(\d{1,2})[.)]\s+(.*)$/.exec(l)
    if (numero) {
      return { t: "numero", n: numero[1] ?? "", contenu: inline(numero[2] ?? "") }
    }

    return { t: "paragraphe", contenu: inline(l) }
  })
}
