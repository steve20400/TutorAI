/**
 * Ce qui s'affiche pendant qu'un écran se charge, partout sous `[langue]`.
 *
 * Sans ce fichier, Next garde l'écran précédent jusqu'à ce que le suivant
 * soit prêt. On clique, rien ne bouge, et on ne sait pas si le clic a porté
 * ou si l'application est en panne — alors on reclique.
 *
 * Un seul fichier ici plutôt qu'un par route : il couvre tous les écrans qui
 * n'en définissent pas un plus précis. L'annuaire a le sien, parce que sa
 * forme — deux colonnes — vaut la peine d'être annoncée.
 *
 * Ce n'est pas un cercle au milieu du vide : c'est la silhouette de ce qui
 * arrive. L'œil reconnaît la page avant de pouvoir la lire.
 */
export default function Chargement() {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-4 px-4 pb-10 pt-8 lg:px-6">
      <Barre largeur="45%" hauteur={28} />
      <Barre largeur="30%" hauteur={13} />
      <div className="h-3" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[12px] p-5"
          style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
        >
          <Barre largeur="40%" hauteur={14} />
          <div className="h-2.5" />
          <Barre largeur="85%" hauteur={11} />
        </div>
      ))}
    </div>
  )
}

function Barre({ largeur, hauteur }: { largeur: string; hauteur: number }) {
  return (
    <div
      className="rounded-full"
      style={{
        width: largeur,
        height: hauteur,
        background: "color-mix(in srgb, var(--texte) 9%, transparent)",
      }}
    />
  )
}
