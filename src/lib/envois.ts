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

/**
 * Combien de temps on attend le Service Worker avant de s'en passer.
 *
 * `serviceWorker.ready` ne se résout JAMAIS si aucun Service Worker ne
 * s'enregistre — navigation privée, réglage du navigateur, extension qui le
 * bloque. Sans cette limite, l'envoi resterait « en cours » indéfiniment et
 * personne ne saurait quoi faire de cet écran.
 */
const ATTENTE_SW = 3000

/** Ce que la file a pu garantir : une reprise automatique, ou rien. */
export type MiseEnFile = { reprisePossible: boolean }

function serviceWorkerPret(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null)
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((r) => setTimeout(() => r(null), ATTENTE_SW)),
  ]).catch(() => null)
}

/**
 * Met l'envoi dans la file, puis demande au navigateur de s'en charger.
 *
 * Cette fonction ne lève pas parce que la reprise automatique est
 * indisponible. C'est une distinction qui a son importance : Background Sync
 * existe mais peut être ÉTEINT — par un réglage, par une stratégie
 * d'entreprise, en navigation privée — et `sync.register()` lève alors
 * « Background Sync is disabled ». Tant que cette erreur remontait, elle
 * emportait l'envoi entier avec elle : le fichier ne partait pas, alors que
 * la connexion était bonne et que rien n'empêchait de l'envoyer tout de suite.
 *
 * Ce qui est renvoyé dit seulement si, en cas d'échec, quelqu'un reprendra le
 * travail. L'appelant s'en sert pour annoncer « reprise au retour du réseau »
 * plutôt qu'« envoyé », ou l'inverse.
 */
export async function mettreEnFile(
  envoi: EnvoiEnAttente,
): Promise<MiseEnFile> {
  const base = await ouvrir()
  await new Promise<void>((resoudre, rejeter) => {
    const t = base.transaction(MAGASIN, "readwrite")
    t.objectStore(MAGASIN).put(envoi)
    t.oncomplete = () => resoudre()
    t.onerror = () => rejeter(t.error)
  })

  const inscription = await serviceWorkerPret()
  if (!inscription) return { reprisePossible: false }

  // Background Sync : le navigateur rappelle le Service Worker dès que la
  // connexion revient, même si l'onglet a été fermé entre-temps.
  const sync = (inscription as ServiceWorkerRegistration & {
    sync?: { register: (etiquette: string) => Promise<void> }
  }).sync

  if (sync) {
    try {
      await sync.register(ETIQUETTE)
      return { reprisePossible: true }
    } catch {
      // Présent mais éteint. On retombe sur la reprise à l'ouverture.
    }
  }

  // Safari et iOS ne l'ont pas non plus. On demande la reprise tout de suite,
  // et elle recommencera à la prochaine ouverture de l'application : c'est
  // moins bien, et toujours mieux que de perdre le fichier.
  inscription.active?.postMessage({ type: "reprendre-envois" })
  return { reprisePossible: true }
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
