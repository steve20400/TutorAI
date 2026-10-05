/**
 * Ce qui s'affiche pendant qu'un écran d'administration se charge.
 *
 * L'application l'avait, l'administration non. On cliquait une rubrique et
 * rien ne bougeait : Next garde l'écran précédent tant que le suivant n'est
 * pas prêt, et ces pages-là interrogent le service — dossiers à vérifier,
 * familles, séances. Sur grand écran comme sur téléphone, le clic paraissait
 * perdu, alors que la page arrivait.
 *
 * Posé à la racine de l'espace plutôt que par page : il couvre les dix-sept
 * écrans d'un coup, et surtout les suivants, qui n'auront rien à déclarer.
 * La barre latérale vit dans la mise en page, donc elle ne clignote pas —
 * seule la colonne de droite se redessine, et c'est bien elle qu'on attend.
 *
 * Deux lignes de titre puis des rangées : la forme commune à presque tous ces
 * écrans. Ce n'est pas un cercle au milieu du vide ; on reconnaît la page
 * avant de pouvoir la lire.
 */
export default function ChargementAdmin() {
  return (
    <div className="animate-pulse px-5 pb-7 pt-6 sm:px-7">
      <Barre largeur="34%" hauteur={22} />
      <div className="h-2.5" />
      <Barre largeur="52%" hauteur={12} />

      <div className="mt-7 flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-[10px] px-4 py-3.5"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            <div
              className="h-8 w-8 shrink-0 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--texte) 9%, transparent)",
              }}
            />
            <div className="min-w-0 flex-1">
              <Barre largeur="38%" hauteur={12} />
              <div className="h-2" />
              <Barre largeur="62%" hauteur={10} />
            </div>
            <div className="hidden sm:block">
              <Barre largeur="84px" hauteur={11} />
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
