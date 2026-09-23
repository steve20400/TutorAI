/**
 * File d'envois qui survit à la fermeture de l'onglet.
 *
 * Le fichier est rangé dans IndexedDB avant de partir. S'il n'arrive pas — la
 * connexion coupe, on recharge, on ferme l'onglet — le Service Worker le
 * reprend dès que le réseau revient, sans qu'on ait à le rechoisir.
 *
 * C'est écrit pour des connexions qui coupent. Ailleurs, ce serait du luxe ;
 * ici, c'est la différence entre une photo déposée et une photo à redéposer.
 */

const BASE = "tutela-envois"
const MAGASIN = "attente"
const ETIQUETTE = "tutela-envois"

export type EnvoiEnAttente = {
  id: string
  supabaseUrl: string
  clePubliable: string
  jeton: string
  chemin: string
  blob: Blob
  /** Adresse à appeler une fois le fichier arrivé, pour le rattacher. */
  rattacherA: string
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(BASE, 1)
    demande.onupgradeneeded = () => {
      if (!demande.result.objectStoreNames.contains(MAGASIN)) {
        demande.result.createObjectStore(MAGASIN, { keyPath: "id" })
      }
    }
    demande.onsuccess = () => resoudre(demande.result)
    demande.onerror = () => rejeter(demande.error)
  })
}

/** Met l'envoi dans la file, puis demande au navigateur de s'en charger. */
export async function mettreEnFile(envoi: EnvoiEnAttente): Promise<void> {
  const base = await ouvrir()
  await new Promise<void>((resoudre, rejeter) => {
    const t = base.transaction(MAGASIN, "readwrite")
    t.objectStore(MAGASIN).put(envoi)
    t.oncomplete = () => resoudre()
    t.onerror = () => rejeter(t.error)
  })

  const inscription = await navigator.serviceWorker?.ready
  if (!inscription) return

  // Background Sync : le navigateur rappelle le Service Worker dès que la
  // connexion revient, même si l'onglet a été fermé entre-temps.
  const sync = (inscription as ServiceWorkerRegistration & {
    sync?: { register: (etiquette: string) => Promise<void> }
  }).sync

  if (sync) {
    await sync.register(ETIQUETTE)
  } else {
    // Safari et iOS ne l'ont pas. On demande la reprise tout de suite, et
    // elle recommencera à la prochaine ouverture de l'application : c'est
    // moins bien, et toujours mieux que de perdre le fichier.
    inscription.active?.postMessage({ type: "reprendre-envois" })
  }
}

/** À l'ouverture de l'application : reprendre ce qui traîne. */
export function reprendreLesEnvois(): void {
  void navigator.serviceWorker?.ready.then((inscription) => {
    inscription.active?.postMessage({ type: "reprendre-envois" })
  })
}

/** Combien d'envois attendent encore. Sert à l'indicateur. */
export async function envoisEnAttente(): Promise<number> {
  try {
    const base = await ouvrir()
    return await new Promise<number>((resoudre) => {
      const d = base.transaction(MAGASIN, "readonly").objectStore(MAGASIN).count()
      d.onsuccess = () => resoudre(d.result)
      d.onerror = () => resoudre(0)
    })
  } catch {
    return 0
  }
}
