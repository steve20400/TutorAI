/**
 * Ce qui s'affiche pendant que l'annuaire se charge.
 *
 * Sans ce fichier, Next garde l'écran précédent jusqu'à ce que la page soit
 * prête : on clique « Trouver un répétiteur », rien ne bouge, et on reclique.
 * C'est exactement ce que Steve a décrit — « ça reste nous regarder comme si
 * on n'avait pas cliqué ».
 *
 * Il ne montre pas un cercle au milieu du vide, mais la forme de ce qui
 * arrive : la barre de filtres à gauche, trois fiches à droite. L'œil
 * reconnaît la page avant de pouvoir la lire, et l'attente ne ressemble plus
 * à une panne.
 *
 * L'en-tête n'y est pas : la coque appartient à la page, et la dessiner ici
 * en ferait une deuxième à garder d'accord avec la première.
 */
export default function ChargementAnnuaire() {
  return (
    <div className="flex flex-1 animate-pulse gap-9 px-3 pb-10 pt-3.5 lg:px-[30px] lg:pt-[26px]">
      {/* La barre de filtres. */}
      <div className="hidden w-[238px] flex-shrink-0 flex-col gap-4 lg:flex">
        <Barre largeur="60%" hauteur={12} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Barre key={`v-${i}`} largeur="100%" hauteur={13} />
        ))}
        <div className="h-3" />
        <Barre largeur="45%" hauteur={12} />
        <div className="flex flex-wrap gap-[5px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <Pastille key={`m-${i}`} />
          ))}
        </div>
      </div>

      {/* Les fiches. */}
      <div className="min-w-0 flex-1">
        <Barre largeur="40%" hauteur={14} />
        <div className="h-4" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="mb-2.5 flex gap-3 rounded-[11px] p-3 lg:mb-3.5 lg:gap-5 lg:rounded-[14px] lg:p-5"
            style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
          >
            <div
              className="h-28 w-[104px] flex-shrink-0 rounded-[9px] lg:h-[168px] lg:w-[206px] lg:rounded-[10px]"
              style={{ background: "color-mix(in srgb, var(--texte) 9%, transparent)" }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <Barre largeur="45%" hauteur={16} />
              <Barre largeur="60%" hauteur={11} />
              <div className="h-1" />
              <Barre largeur="100%" hauteur={11} />
              <Barre largeur="92%" hauteur={11} />
              <Barre largeur="70%" hauteur={11} />
            </div>
          </div>
        ))}
      </div>
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

function Pastille() {
  return (
    <div
      className="h-[26px] w-[70px] rounded-[20px]"
      style={{ background: "color-mix(in srgb, var(--texte) 9%, transparent)" }}
    />
  )
}
