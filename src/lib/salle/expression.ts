/**
 * Lire une expression mathématique, et en faire une fonction.
 *
 * ── POURQUOI PAS `eval` ──
 *
 * Parce que l'expression vient de l'autre côté du réseau. Le répétiteur tape
 * `(2x+1)/(x-1)` et l'élève le reçoit ; si l'élève l'exécutait avec `eval`,
 * n'importe quelle chaîne envoyée sur le canal deviendrait du code dans son
 * navigateur. Sur une plateforme où un adulte et un mineur partagent une
 * salle, c'est exactement la porte qu'il ne faut pas laisser.
 *
 * Cet analyseur ne connaît que des nombres, `x`, cinq opérateurs, des
 * parenthèses et une liste fermée de fonctions. Tout le reste est refusé.
 *
 * ── CE QU'IL ACCEPTE, ET POURQUOI C'EST ÉCRIT COMME ÇA ──
 *
 * `2x` et `3(x+1)` sans signe de multiplication, parce que c'est ainsi qu'on
 * écrit au tableau. Un élève qui recopie son énoncé ne met pas d'astérisque, et
 * lui refuser sa propre notation ferait de l'outil un obstacle.
 *
 * `^` pour la puissance, et il est associatif à DROITE : `2^3^2` vaut 512 et
 * non 64. C'est la convention des mathématiques, pas celle de la plupart des
 * langages — et c'est la bonne ici, puisque c'est un cours de mathématiques.
 *
 * ── CE QU'IL REND QUAND ÇA N'A PAS DE SENS ──
 *
 * `NaN`, jamais une exception. `1/0` à l'abscisse 0, `sqrt(-1)`, `ln(0)` : ce
 * sont des points où la courbe n'existe pas, pas des pannes. Le traceur lève
 * son crayon et continue — c'est précisément ce qu'on veut montrer d'une
 * fonction qui a une asymptote.
 */

export type Fonction = (x: number) => number

const FONCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
}

const CONSTANTES: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

type Jeton =
  | { t: "nombre"; v: number }
  | { t: "x" }
  | { t: "nom"; v: string }
  | { t: "op"; v: string }
  | { t: "(" }
  | { t: ")" }

/** Découpe la chaîne. Les espaces ne comptent pas, le reste est refusé. */
function decouper(source: string): Jeton[] | null {
  const jetons: Jeton[] = []
  let i = 0
  const s = source.toLowerCase()

  while (i < s.length) {
    const c = s[i]

    if (c === " " || c === "\t") {
      i++
      continue
    }

    if (c >= "0" && c <= "9") {
      let j = i
      while (j < s.length && ((s[j] >= "0" && s[j] <= "9") || s[j] === ".")) j++
      const v = Number(s.slice(i, j))
      if (!Number.isFinite(v)) return null
      jetons.push({ t: "nombre", v })
      i = j
      continue
    }

    if (c >= "a" && c <= "z") {
      let j = i
      while (j < s.length && s[j] >= "a" && s[j] <= "z") j++
      const mot = s.slice(i, j)
      if (mot === "x") jetons.push({ t: "x" })
      else jetons.push({ t: "nom", v: mot })
      i = j
      continue
    }

    if ("+-*/^".includes(c)) {
      jetons.push({ t: "op", v: c })
      i++
      continue
    }
    if (c === "(") {
      jetons.push({ t: "(" })
      i++
      continue
    }
    if (c === ")") {
      jetons.push({ t: ")" })
      i++
      continue
    }

    // Un caractère inconnu : on refuse l'expression entière plutôt que de
    // l'ignorer. Ignorer ferait tracer une courbe qui n'est pas celle qu'on a
    // écrite, ce qui est pire que de ne rien tracer.
    return null
  }

  return jetons
}

/**
 * Analyse et évalue. Rend `null` si l'expression n'a pas de sens — et c'est
 * l'écran qui le dit, pas une exception qui remonte jusqu'à la salle.
 */
export function lireExpression(source: string): Fonction | null {
  const jetons = decouper(source)
  if (!jetons || jetons.length === 0) return null

  let i = 0
  const voir = () => jetons[i]
  const avaler = () => jetons[i++]

  // Les quatre fonctions ci-dessous s'appellent mutuellement : sans ce nom,
  // TypeScript ne sait pas déduire leur type et renonce.
  type Noeud = (x: number) => number

  // somme := produit (('+' | '-') produit)*
  function somme(): Noeud | null {
    let gauche: Noeud | null = produit()
    if (!gauche) return null
    for (;;) {
      const j = voir()
      if (j?.t !== "op" || (j.v !== "+" && j.v !== "-")) return gauche
      avaler()
      const droite = produit()
      if (!droite) return null
      const g: Noeud = gauche
      const dr: Noeud = droite
      gauche =
        j.v === "+"
          ? (x: number) => g(x) + dr(x)
          : (x: number) => g(x) - dr(x)
    }
  }

  // produit := unaire (('*' | '/' | implicite) unaire)*
  function produit(): Noeud | null {
    let gauche: Noeud | null = unaire()
    if (!gauche) return null
    for (;;) {
      const j = voir()
      if (!j) return gauche

      // La multiplication implicite : `2x`, `3(x+1)`, `2sin(x)`. C'est ainsi
      // qu'on écrit au tableau, et un élève qui recopie son énoncé ne met pas
      // d'astérisque.
      const implicite = j.t === "x" || j.t === "(" || j.t === "nom" || j.t === "nombre"
      const explicite = j.t === "op" && (j.v === "*" || j.v === "/")
      if (!implicite && !explicite) return gauche

      let division = false
      if (explicite) {
        division = (avaler() as { v: string }).v === "/"
      }

      const droite = unaire()
      if (!droite) return null
      const g: Noeud = gauche
      const dr: Noeud = droite
      gauche = division
        ? (x: number) => g(x) / dr(x)
        : (x: number) => g(x) * dr(x)
    }
  }

  /**
   * unaire := ('-' | '+') unaire | puissance
   *
   * Le signe lie plus LÂCHE que la puissance, et c'est ce qui fait que
   * `-2^2` vaut -4 et non 4 : on lit « l'opposé de deux au carré ». La
   * plupart des langages de programmation font l'inverse ; les mathématiques
   * font ceci, et c'est un cours de mathématiques qu'on donne dessus.
   */
  function unaire(): Noeud | null {
    const j = voir()
    if (j?.t === "op" && (j.v === "-" || j.v === "+")) {
      avaler()
      const suite = unaire()
      if (!suite) return null
      return j.v === "-" ? (x) => -suite(x) : suite
    }
    return puissance()
  }

  /**
   * puissance := atome ('^' unaire)?  — associatif à DROITE.
   *
   * La BASE est un atome, jamais un signe : sans quoi `-2^2` prendrait `-2`
   * pour base. L'EXPOSANT, lui, accepte un signe — `2^-1` vaut un demi, et on
   * l'écrit tous les jours.
   */
  function puissance(): Noeud | null {
    const base = atome()
    if (!base) return null
    const j = voir()
    if (j?.t !== "op" || j.v !== "^") return base
    avaler()
    const exposant = unaire()
    if (!exposant) return null
    return (x) => Math.pow(base(x), exposant(x))
  }

  function atome(): Noeud | null {
    const j = avaler()
    if (!j) return null

    if (j.t === "nombre") return () => j.v
    if (j.t === "x") return (x) => x

    if (j.t === "(") {
      const dedans = somme()
      if (!dedans) return null
      if (avaler()?.t !== ")") return null
      return dedans
    }

    if (j.t === "nom") {
      const constante = CONSTANTES[j.v]
      if (constante !== undefined) return () => constante

      const f = FONCTIONS[j.v]
      if (!f) return null
      // Une fonction sans parenthèses n'a pas d'argument : `sin` seul n'est pas
      // une expression, et l'accepter tracerait n'importe quoi.
      if (avaler()?.t !== "(") return null
      const argument = somme()
      if (!argument) return null
      if (avaler()?.t !== ")") return null
      return (x) => f(argument(x))
    }

    return null
  }

  const arbre = somme()
  // Tout doit avoir été consommé : `2x)` ou `x 3` sont des erreurs, pas des
  // expressions dont on garderait le début.
  if (!arbre || i !== jetons.length) return null

  return (x) => {
    const v = arbre(x)
    // `NaN` plutôt qu'une exception : un point où la courbe n'existe pas est
    // un trou à dessiner, pas une panne à signaler.
    return Number.isFinite(v) ? v : NaN
  }
}
