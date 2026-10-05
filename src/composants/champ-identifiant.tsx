"use client"

import { useEffect, useState } from "react"

import { supabaseNavigateur } from "@/lib/supabase/client"
import { useLangue } from "@/langues/contexte"

/**
 * Met un nom de connexion en forme, comme la base le fait.
 *
 * La même règle vit dans `normaliser_identifiant` (migration 025), et c'est
 * ELLE qui fait foi : celle-ci sert à montrer tout de suite ce qui sera
 * enregistré. Sans cela, on tape « Alain NKOULOU » et on découvre « alain
 * nkoulou » après coup, en se demandant si quelque chose a mal tourné.
 *
 * Accents retirés : quelqu'un qui tape « nadege » depuis un clavier sans
 * accents doit atteindre le compte de Nadège. Apostrophe et tiret gardés, ils
 * sont dans les noms d'ici — N'Dongo, Ngo-Bell.
 */
export function normaliser(saisie: string): string {
  return saisie
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9'\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

type Verdict = "vide" | "court" | "attente" | "libre" | "pris" | "muet"

/**
 * Le champ du nom de connexion, qui dit tout de suite s'il est libre.
 *
 * Il était fabriqué par la machine et figé à vie : « alain nkoulou 2 », parce
 * qu'un homonyme était arrivé avant. Or c'est le seul nom avec lequel un
 * enfant se connecte — il n'a pas d'adresse — et c'est celui que n'importe
 * qui préfère taper plutôt qu'une adresse complète.
 *
 * La réponse arrive PENDANT la saisie, pas à l'envoi. Apprendre que son nom
 * est pris après avoir rempli huit champs et choisi un mot de passe, c'est
 * les reperdre tous. L'attente est de 450 ms après la dernière frappe : assez
 * pour ne pas interroger la base à chaque lettre, assez peu pour que la
 * réponse arrive avant qu'on ait changé de champ.
 *
 * Il n'empêche jamais d'envoyer. Le verdict peut avoir changé entre-temps, et
 * c'est la base qui tranche — le déclencheur d'inscription refuse et le dit.
 * Un bouton grisé sur un verdict périmé est pire qu'un refus net.
 */
export function ChampIdentifiant({
  label,
  aide,
  name = "identifiant",
  enfant = false,
  valeurInitiale = "",
}: {
  label: string
  aide: string
  name?: string
  /** Change le tutoiement du message de refus, rien d'autre. */
  enfant?: boolean
  valeurInitiale?: string
}) {
  const { d } = useLangue()
  const t = d.inscriptionRole

  const [saisie, poserSaisie] = useState(valeurInitiale)
  const [verdict, poserVerdict] = useState<Verdict>("vide")

  const propre = normaliser(saisie)
  const depart = normaliser(valeurInitiale)

  useEffect(() => {
    if (propre === "") {
      poserVerdict("vide")
      return
    }
    if (propre.length < 3) {
      poserVerdict("court")
      return
    }
    // Le sien n'est pas « pris » par quelqu'un d'autre : sur l'écran du
    // compte, ne rien changer ne doit pas s'afficher en rouge.
    if (propre === depart) {
      poserVerdict("libre")
      return
    }

    poserVerdict("attente")
    const minuterie = setTimeout(() => {
      void (async () => {
        try {
          const supabase = supabaseNavigateur()
          const { data, error } = await supabase.rpc("identifiant_disponible", {
            saisie: propre,
          })
          if (error) throw error
          poserVerdict(data === true ? "libre" : "pris")
        } catch (erreur) {
          // Muet plutôt que menteur : on ne dira pas « libre » faute de
          // réponse, et on ne barrera pas la route non plus. La base tranchera.
          console.error("[identifiant] vérification impossible :", erreur)
          poserVerdict("muet")
        }
      })()
    }, 450)

    return () => clearTimeout(minuterie)
  }, [propre, depart])

  const message: Record<Verdict, { texte: string; couleur: string } | null> = {
    vide: null,
    muet: null,
    court: { texte: t.identifiantCourt, couleur: "var(--texte-doux)" },
    attente: { texte: t.identifiantVerifie, couleur: "var(--texte-doux)" },
    libre: { texte: t.identifiantLibre, couleur: "var(--accent-doux-texte)" },
    pris: {
      texte: enfant ? t.identifiantPrisEnfant : t.identifiantPris,
      couleur: "var(--voyant)",
    },
  }
  const dit = message[verdict]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <label className="champ-flottant">
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={saisie}
            onChange={(e) => poserSaisie(e.target.value)}
            placeholder=" "
            required
          />
          <span>{label}</span>
        </label>
      </div>

      {/* C'est la forme normalisée qui part, et non ce qui est affiché. Le
          champ laisse écrire « Alain NKOULOU » pendant la frappe — personne
          n'aime être corrigé lettre par lettre — et c'est « alain nkoulou »
          qui est envoyé, comme la base l'enregistrera. */}
      <input type="hidden" name={name} value={propre} />

      {/* Ce qui partira vraiment, quand ce n'est pas ce qu'on a tapé. */}
      {propre && propre !== saisie.trim() ? (
        <span className="doux px-1 text-xs">{propre}</span>
      ) : null}

      {dit ? (
        <span className="px-1 text-xs" style={{ color: dit.couleur }}>
          {dit.texte}
        </span>
      ) : (
        <span className="doux px-1 text-xs">{aide}</span>
      )}
    </div>
  )
}
