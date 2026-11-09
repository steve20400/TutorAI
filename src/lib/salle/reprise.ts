/**
 * Quand réessayer, quand renoncer, et jusqu'où garder.
 *
 * ── POURQUOI CE N'EST PAS UN DÉTAIL ──
 *
 * La première version abandonnait un morceau après quatre essais. Avec une
 * bouffée toutes les quinze secondes, cela fait une minute de coupure — ce
 * qui est COURT ici. Une coupure de dix minutes effaçait donc dix minutes de
 * parole, en silence, pendant que la salle affichait « micro actif ».
 *
 * Or une coupure n'est pas un refus. Les deux arrivaient au même endroit du
 * code et finissaient pareil : abandonnés. Il faut les séparer.
 *
 *   • Le réseau est tombé      → on GARDE, et on attend. Indéfiniment.
 *   • La base a dit non        → on renonce, et on le dit. Réessayer mille
 *                                fois une politique qui refuse ne la fera pas
 *                                changer d'avis, et le tampon grossirait sans
 *                                fin.
 *
 * ── LA MÉMOIRE EST LA VRAIE LIMITE ──
 *
 * On ne peut pas garder indéfiniment : un onglet qui enfle finit tué par le
 * système, et il emporte la séance avec lui. La limite n'est donc pas un
 * nombre d'essais mais un BUDGET D'OCTETS — ce qui se raisonne : à 24 kbit/s,
 * vingt mégaoctets valent près de deux heures de parole. Une coupure plus
 * longue que la séance elle-même.
 *
 * Et quand il faut vraiment jeter, on jette le PLUS ANCIEN et on dit lesquelles
 * des secondes manquent. Un enregistrement troué qui sait où sont ses trous
 * reste une pièce ; un enregistrement troué qui l'ignore n'en est plus une.
 */

/** Vingt mégaoctets : à 24 kbit/s, près de deux heures de parole en attente. */
export const BUDGET_OCTETS = 20 * 1024 * 1024

/** Le délai avant le prochain essai, en millisecondes. */
export function prochainDelai(essais: number): number {
  // 2 s, 4, 8, 16, 32, puis un palier à une minute.
  //
  // Le palier compte autant que la montée : sans lui, après vingt minutes de
  // coupure on réessaierait toutes les trois heures, et le retour du réseau
  // ne servirait à rien. Une minute est courte pour une machine et
  // imperceptible pour la séance.
  const montee = 2000 * Math.pow(2, Math.max(0, essais))
  return Math.min(montee, 60_000)
}

/**
 * Cette erreur vient-elle du réseau, ou d'un refus ?
 *
 * Un refus porte un code : la politique a dit non, la ligne existe déjà, le
 * fichier est trop gros. Réessayer ne changera rien — et pour le doublon,
 * réessayer serait même nuisible.
 *
 * Tout le reste est traité comme un problème de réseau, donc gardé. C'est le
 * bon côté sur lequel se tromper : garder un morceau qu'on ne pourra jamais
 * déposer coûte de la mémoire ; jeter un morceau qu'on aurait pu déposer
 * coûte la parole d'un enfant.
 */
export function estUnRefus(erreur: unknown): boolean {
  const e = erreur as { statusCode?: unknown; status?: unknown; code?: unknown }
  const brut = e?.statusCode ?? e?.status ?? e?.code
  const n = Number(brut)

  // Les codes HTTP de refus : 400 mauvaise requête, 401/403 droit refusé,
  // 409 déjà là, 413 trop gros, 422 invalide.
  if (Number.isFinite(n) && n >= 400 && n < 500) return true

  // Les codes Postgres : 42501 droit refusé, 23505 doublon, 23514 contrainte.
  const code = typeof brut === "string" ? brut : ""
  return ["42501", "23505", "23514", "23503"].includes(code)
}

/** Ce que pèse une file d'attente. */
export function poidsDeLaFile(tailles: readonly number[]): number {
  return tailles.reduce((somme, t) => somme + t, 0)
}

/**
 * Combien de morceaux jeter en tête pour revenir dans le budget ?
 *
 * Les plus anciens, parce qu'ils sont les plus loin du moment présent — et
 * parce que jeter les plus récents reviendrait à ne jamais rattraper le
 * retard : on effacerait précisément ce qu'on vient d'enregistrer.
 */
export function aJeterEnTete(
  tailles: readonly number[],
  nouveau: number,
  budget: number = BUDGET_OCTETS,
): number {
  let total = poidsDeLaFile(tailles) + nouveau
  let jetes = 0
  while (total > budget && jetes < tailles.length) {
    total -= tailles[jetes] ?? 0
    jetes += 1
  }
  return jetes
}

/**
 * Faut-il attendre le réseau plutôt que d'essayer ?
 *
 * `navigator.onLine` ment dans un sens seulement : il dit « en ligne » quand
 * une carte réseau est branchée même sans Internet derrière. Il ne dit
 * presque jamais « hors ligne » à tort. On ne s'en sert donc que pour
 * ÉVITER un essai voué à l'échec, jamais pour déclarer que tout va bien.
 */
export function inutileDEssayer(enLigne: boolean | undefined): boolean {
  return enLigne === false
}
