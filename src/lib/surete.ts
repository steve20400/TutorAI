/**
 * La sûreté d'un mot de passe, estimée honnêtement.
 *
 * Sans dépendance : les bibliothèques du genre pèsent plusieurs centaines de
 * kilo-octets de dictionnaires, et cette application s'ouvre sur des forfaits
 * comptés au mégaoctet.
 *
 * Ce qu'elle mesure et ce qu'elle refuse de mesurer, parce qu'une jauge qui
 * ment est pire que pas de jauge. `Password1!` coche majuscule, minuscule,
 * chiffre et symbole, et se casse en quelques secondes ; `les trois chats de
 * ma grand-mère` n'en coche que deux et tiendrait des siècles. La longueur
 * décide donc, la variété ajoute à la marge, et trois défauts ramènent au
 * plancher :
 *
 * — le mot de passe contient son propre prénom ou son adresse, ce qui est la
 *   première chose qu'on essaie contre quelqu'un qu'on connaît ;
 * — une seule lettre répétée ;
 * — une suite du clavier ou de l'alphabet, dans un sens ou dans l'autre.
 *
 * Elle n'interdit rien. Le minimum — six caractères pour un enfant, huit pour
 * un adulte — reste vérifié par le service, qui est le seul endroit où une
 * règle tient. Celle-ci informe pendant qu'on écrit.
 */

/** 0 trop court · 1 faible · 2 correct · 3 solide. */
export type Surete = 0 | 1 | 2 | 3

const SUITES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "azertyuiop",
  "qwertyuiop",
  "qsdfghjklm",
  "asdfghjkl",
]

/** Une suite de quatre caractères ou plus, dans un sens ou dans l'autre. */
function porteUneSuite(mdp: string): boolean {
  const bas = mdp.toLowerCase()
  for (const suite of SUITES) {
    const envers = [...suite].reverse().join("")
    for (const source of [suite, envers]) {
      for (let i = 0; i + 4 <= source.length; i++) {
        if (bas.includes(source.slice(i, i + 4))) return true
      }
    }
  }
  return false
}

/** Une seule lettre, répétée. « aaaaaaaa » fait huit caractères et rien d'autre. */
function unSeulCaractere(mdp: string): boolean {
  return mdp.length > 0 && new Set(mdp).size === 1
}

/**
 * Le mot de passe contient-il quelque chose qu'on sait déjà de la personne ?
 *
 * Les fragments de moins de trois lettres sont ignorés : interdire « li »
 * parce que quelqu'un s'appelle Li reviendrait à condamner un mot de passe
 * correct pour une coïncidence.
 */
function porteUnIndice(mdp: string, aEviter: readonly string[]): boolean {
  const bas = mdp.toLowerCase()
  return aEviter.some((brut) => {
    const indice = brut.trim().toLowerCase()
    return indice.length >= 3 && bas.includes(indice)
  })
}

export function sureteDuMotDePasse(
  mdp: string,
  minimum: number,
  /** Prénom, nom, début d'adresse — ce qu'un proche connaît déjà. */
  aEviter: readonly string[] = [],
): Surete {
  if (mdp.length < minimum) return 0

  let note = 1
  if (mdp.length >= 12) note += 1
  if (mdp.length >= 16) note += 1

  const familles = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((f) =>
    f.test(mdp),
  ).length
  if (familles >= 3) note += 1

  if (
    unSeulCaractere(mdp) ||
    porteUneSuite(mdp) ||
    porteUnIndice(mdp, aEviter)
  ) {
    note = 1
  }

  return Math.min(note, 3) as Surete
}
