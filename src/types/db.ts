export type RoleUtilisateur = "eleve" | "parent" | "tuteur" | "admin"
export type StatutSeance = "en_cours" | "terminee" | "abandonnee"
export type AuteurMessage = "eleve" | "tuteur"
export type ModeSeance = "texte" | "audio"

export type Profil = {
  id: string
  role: RoleUtilisateur
  prenom: string
  nom: string | null
  telephone: string | null
  pays: string
  cree_le: string
}

export type TuteurIA = {
  id: string
  eleve_id: string
  programme_id: string
  matiere: string
  niveau: string
  manuels: { titre: string }[]
  cree_le: string
}

export type MemoireEleve = {
  tuteur_id: string
  notions_acquises: string[]
  notions_fragiles: string[]
  erreurs_recurrentes: string[]
  maj_le: string
}

export type Seance = {
  id: string
  tuteur_id: string
  lecon_id: string | null
  lecon_titre: string | null
  statut: StatutSeance
  mode: ModeSeance
  resume: string | null
  demarree_le: string
  terminee_le: string | null
}

export type Message = {
  id: number
  seance_id: string
  auteur: AuteurMessage
  contenu: string
  palier: number | null
  cree_le: string
}

/** Structure d'un programme officiel stocké dans `programmes.contenu`. */
export type Lecon = {
  id: string
  titre: string
  prerequis?: string[]
  habiletes?: Record<string, string[]>
  savoirs?: string[]
  savoir_faire?: string[]
}
