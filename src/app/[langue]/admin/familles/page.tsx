import Link from "next/link"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Avatar } from "@/composants/avatar"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

type Famille = {
  id: string
  prenom: string | null
  nom: string | null
  pays: string | null
  identifiant: string | null
  desactive_le: string | null
  /** Le jour où un parent dépose sa photo, elle remplace ses initiales ici
   *  sans autre changement. */
  photo_url: string | null
  enfants: { id: string; prenom: string | null; nom: string | null }[]
}

export default async function PageFamilles({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.familles

  await exigerAdmin(langue)

  // Le service renvoie les enfants avec chaque parent : ni second appel, ni
  // rapprochement à refaire ici.
  const { donnees: liste } = await api<{ donnees: Famille[] }>(
    "/v1/admin/familles",
  )

  const enfantsPar = new Map<string, number>(
    liste.map((p) => [p.id, p.enfants.length]),
  )

  if (liste.length === 0) {
    return (
      <>
        <EnteteAdmin etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} />
      </>
    )
  }

  return (
    <>
      <EnteteAdmin
        etiquette={t.etiquette}
        titre={`${liste.length} ${pluriel(langue, liste.length, t.compte).replace(`${liste.length} `, "")}`}
      />

      <div className="px-5 sm:px-7 pb-7">
        {liste.map((p) => {
          const n = enfantsPar.get(p.id) ?? 0
          return (
            <Link
              key={p.id}
              href={chemin(langue, `/admin/familles/${p.id}`)}
              className="flex items-center gap-4 border-b py-3 transition hover:opacity-70"
              style={{ borderColor: "var(--bordure)" }}
            >
              <Avatar
                nom={[p.prenom, p.nom].filter(Boolean).join(" ")}
                photoUrl={p.photo_url ?? null}
                taille={30}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">
                  {[p.prenom, p.nom].filter(Boolean).join(" ")}
                </div>
                <div className="doux mt-0.5 text-[12px]">
                  {n === 0
                    ? t.aucunEnfant
                    : pluriel(langue, n, t.enfants)}
                </div>
              </div>
              {/* Une famille inscrite qui n'a jamais commencé est le signal
                  utile : c'est elle qu'il faut rappeler. */}
              <span className={n === 0 ? "badge-eteint" : "badge-verifie"}>
                {n === 0 ? t.aucuneSeance : pluriel(langue, n, t.enfants)}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
