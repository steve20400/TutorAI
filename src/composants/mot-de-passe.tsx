"use client"

import { useState } from "react"

import { useLangue } from "@/langues/contexte"

/**
 * Le bouton qui montre le mot de passe pendant qu'on le tape.
 *
 * Il est écrit en toutes lettres — « Voir », « Cacher » — et non dessiné. Le
 * symbole universel pour cette fonction est un œil, et c'est précisément un
 * de ceux que ce projet s'interdit : au Cameroun, l'œil seul évoque les
 * sectes, pas la lecture d'un formulaire. Un mot se lit sans ambiguïté, y
 * compris par quelqu'un qui n'a pas l'habitude des conventions d'interface.
 *
 * `aria-pressed` dit l'état aux lecteurs d'écran ; le libellé visible dit
 * l'action à venir, ce qui est la convention pour un bouton.
 */
export function BoutonVoir({
  visible,
  basculer,
}: {
  visible: boolean
  basculer: () => void
}) {
  const { d } = useLangue()

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={visible}
      aria-label={visible ? d.commun.cacherMotDePasse : d.commun.voirMotDePasse}
      className="bascule-mot-de-passe"
      // Le champ ne doit pas perdre le focus quand on appuie : sinon
      // l'étiquette flottante retombe et le curseur saute à la fin.
      onMouseDown={(e) => e.preventDefault()}
    >
      {visible ? d.commun.cacher : d.commun.voir}
    </button>
  )
}

/** L'état, séparé, pour les champs qui ont leur propre habillage. */
export function useVisibilite() {
  const [visible, poser] = useState(false)
  return {
    visible,
    basculer: () => poser((v) => !v),
    /** Le type à donner à l'input. */
    type: visible ? "text" : "password",
  }
}

/**
 * Un champ de mot de passe sans étiquette flottante, pour les écrans qui
 * utilisent la classe `.champ` directement — l'administration et l'espace
 * adulte.
 */
export function EntreeMotDePasse({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { visible, basculer, type } = useVisibilite()

  return (
    <span className="zone-mot-de-passe">
      <input {...props} type={type} className={`${className ?? ""} avec-bascule`} />
      <BoutonVoir visible={visible} basculer={basculer} />
    </span>
  )
}
