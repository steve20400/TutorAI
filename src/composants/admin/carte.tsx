"use client"

import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

export type Ville = {
  nom: string
  lon: number | null
  lat: number | null
}

/**
 * La couverture du pays, sur une vraie carte.
 *
 * C'est la pièce du tableau de bord : elle répond d'un coup d'œil à la seule
 * question que l'administration se pose le matin — où manque-t-il quelqu'un.
 * Des barres triées par volume répondaient à « qui est le plus fourni », qui
 * n'appelle aucune décision.
 *
 * MapLibre et non Leaflet : Leaflet ne sait pas tourner. Il rend des tuiles
 * déjà dessinées, orientées nord, et les empile — aucune rotation n'est
 * possible sans redessiner le monde. MapLibre rend des tuiles vectorielles sur
 * le processeur graphique, donc l'orientation et l'inclinaison sont de simples
 * paramètres de caméra. C'est ce qui permet de tourner la carte au clic droit,
 * et à deux doigts sur un téléphone.
 *
 * Le style vient de la base et non d'ici : changer de fournisseur de tuiles —
 * ou passer à des tuiles hébergées à la maison — ne doit pas demander un
 * déploiement.
 */
export function CarteCouverture({
  villes,
  comptes,
  styleUrl,
  legendeVide,
  etiquetteCarte,
}: {
  villes: Ville[]
  /** Répétiteurs vérifiés par ville. Une ville absente vaut zéro. */
  comptes: Record<string, number>
  styleUrl: string
  legendeVide: string
  etiquetteCarte: string
}) {
  const cadre = useRef<HTMLDivElement>(null)
  const carte = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!cadre.current || carte.current) return

    const m = new maplibregl.Map({
      container: cadre.current,
      style: styleUrl,
      center: [12.4, 6.2],
      zoom: 4.6,
      // La rotation est le sujet : clic droit maintenu sur un ordinateur,
      // deux doigts sur un téléphone.
      dragRotate: true,
      pitchWithRotate: true,
      attributionControl: { compact: true },
    })
    carte.current = m

    m.touchZoomRotate.enable({ around: "center" })
    m.touchPitch.enable()

    // Zoom, boussole et inclinaison réunis : la boussole ne sert à rien si
    // elle ne permet pas de revenir au nord d'un clic après avoir tourné.
    m.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true,
      }),
      "top-right",
    )
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left")
    m.addControl(new maplibregl.FullscreenControl(), "top-right")

    for (const v of villes) {
      if (v.lon === null || v.lat === null) continue
      const n = comptes[v.nom] ?? 0

      const pastille = document.createElement("button")
      pastille.type = "button"
      pastille.className = n > 0 ? "pastille-ville" : "pastille-ville vide"
      pastille.textContent = n > 0 ? String(n) : ""
      pastille.setAttribute("aria-label", `${v.nom} — ${n}`)

      // Le rayon suit la racine du nombre : l'aire du disque reste alors
      // proportionnelle au volume, ce que l'œil lit correctement.
      const taille = n === 0 ? 13 : Math.round(24 + 13 * Math.sqrt(n / 10))
      pastille.style.width = `${taille}px`
      pastille.style.height = `${taille}px`

      new maplibregl.Marker({ element: pastille })
        .setLngLat([v.lon, v.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
            `${v.nom} — ${n}`,
          ),
        )
        .addTo(m)
    }

    return () => {
      m.remove()
      carte.current = null
    }
  }, [villes, comptes, styleUrl])

  const total = Object.values(comptes).reduce((a, b) => a + b, 0)

  return (
    <div className="carte-cadre relative">
      <div
        ref={cadre}
        className="h-full w-full"
        role="application"
        aria-label={etiquetteCarte}
      />
      {total === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
          <p
            className="mx-auto max-w-[280px] rounded-[8px] px-3 py-2 text-center text-[12px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bordure)",
            }}
          >
            {legendeVide}
          </p>
        </div>
      ) : null}
    </div>
  )
}
