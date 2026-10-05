"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import { chemin, type Langue } from "@/langues"
import { useRouter } from "next/navigation"

/**
 * Le choix de la ville, dans la barre d'application.
 *
 * C'était un `<select>` du système. Sur l'encre de la barre, le bouton se
 * fondait à peu près — mais la liste qui s'ouvrait était celle du navigateur :
 * fond blanc, coins carrés, police système, aucune des couleurs du produit.
 * Steve l'a dit comme il faut : « ça ne s'accorde pas avec le design de notre
 * application. »
 *
 * Elle est donc dessinée ici, dans le langage du menu de compte dont elle est
 * la voisine immédiate : même surface, même bordure, mêmes coins de 12 px,
 * même ombre portée. Deux listes déroulantes à trois centimètres l'une de
 * l'autre ne peuvent pas venir de deux mondes différents.
 *
 * Elle garde les autres filtres. Le formulaire d'avant n'envoyait que `ville`,
 * donc choisir une ville effaçait la matière, le niveau et le prix qu'on
 * venait de régler — sans le dire.
 *
 * `page` est retirée au passage : rester en page 4 d'une liste qu'on vient de
 * réduire à six fiches rendait un écran vide.
 */
export function ChoixVille({
  villes,
  active,
  etiquette,
  toutLePays,
  langue,
  encreDoux,
}: {
  villes: string[]
  active?: string
  etiquette: string
  toutLePays: string
  langue: Langue
  encreDoux: string
}) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [, demarrer] = useTransition()
  const zone = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) {
        setOuvert(false)
      }
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false)
    }
    document.addEventListener("mousedown", dehors)
    document.addEventListener("keydown", echap)
    return () => {
      document.removeEventListener("mousedown", dehors)
      document.removeEventListener("keydown", echap)
    }
  }, [ouvert])

  function choisir(v: string) {
    setOuvert(false)
    const p = new URLSearchParams(window.location.search)
    if (v) p.set("ville", v)
    else p.delete("ville")
    p.delete("page")
    const q = p.toString()
    demarrer(() =>
      router.replace(chemin(langue, `/annuaire${q ? `?${q}` : ""}`)),
    )
  }

  const choix = [{ valeur: "", libelle: toutLePays }].concat(
    villes.map((v) => ({ valeur: v, libelle: v })),
  )

  return (
    <div className="relative hidden lg:block" ref={zone}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-label={etiquette}
        className="flex items-center gap-[7px] rounded-[8px] px-1.5 py-1 text-[13.5px] transition hover:opacity-75"
        style={{ color: encreDoux }}
      >
        <Broche taille={15} />
        <span>{active || toutLePays}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="block shrink-0"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {ouvert ? (
        <div
          role="listbox"
          aria-label={etiquette}
          // Une hauteur bornée : douze villes aujourd'hui, et le jour où il y
          // en aura quarante la liste ne doit pas traverser l'écran.
          className="absolute right-0 top-[38px] z-50 max-h-[62vh] w-[216px] overflow-y-auto rounded-[12px] border p-1.5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--bordure)",
            color: "var(--texte)",
            boxShadow: "0 10px 28px rgb(10 16 28 / 0.18)",
          }}
        >
          {choix.map((c, i) => {
            const actif = (active ?? "") === c.valeur
            return (
              <div key={c.valeur || "_tout"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={actif}
                  onClick={() => choisir(c.valeur)}
                  className="flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left text-[13.5px] transition hover:opacity-70"
                  style={{
                    background: actif
                      ? "color-mix(in srgb, var(--texte) 7%, transparent)"
                      : "transparent",
                    fontWeight: actif ? 500 : 400,
                  }}
                >
                  <span className="min-w-0 truncate">{c.libelle}</span>
                  {actif ? <Coche taille={15} /> : null}
                </button>
                {/* « Tout le Cameroun » n'est pas une ville : un filet le
                    sépare de celles qui en sont. */}
                {i === 0 ? (
                  <div
                    className="mx-2 my-1 h-px"
                    style={{ background: "var(--bordure)" }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function Broche({ taille }: { taille: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block shrink-0"
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

function Coche({ taille }: { taille: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block shrink-0"
      style={{ color: "var(--accent)" }}
    >
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  )
}
