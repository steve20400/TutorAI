/**
 * Service Worker de TUTELA — reprise des envois, et rien d'autre.
 *
 * Il ne met AUCUNE page en cache, volontairement. Un cache mal réglé sert une
 * version périmée pendant des jours, et le jour où une correction de sécurité
 * part en production, une partie des gens continue de tourner sur l'ancienne
 * sans que personne ne comprenne pourquoi. Ce Service Worker fait une seule
 * chose : reprendre un envoi interrompu.
 *
 * Le problème qu'il résout : sur une connexion qui coupe, ou quand on ferme
 * l'onglet, un téléversement en cours est perdu. Le fichier avait été choisi,
 * l'attente avait commencé, et il faut tout recommencer — en n'apprenant qu'au
 * retour que rien n'a été enregistré.
 *
 * Ce qu'il fait : le fichier est rangé dans IndexedDB AVANT de partir. S'il
 * n'arrive pas, le navigateur rappelle ce Service Worker dès que la connexion
 * revient, y compris après un rechargement ou la fermeture de l'onglet. Il
 * reprend alors l'envoi tout seul.
 *
 * Ce qu'il ne fait pas : Background Sync n'existe pas sur Safari ni sur iOS.
 * Là-bas, la reprise a lieu à la prochaine ouverture de l'application, ce qui
 * reste mieux que de perdre le fichier.
 */

const BASE = "tutela-envois"
const MAGASIN = "attente"

function ouvrirBase() {
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

function transaction(base, mode) {
  return base.transaction(MAGASIN, mode).objectStore(MAGASIN)
}

function tous(magasin) {
  return new Promise((resoudre, rejeter) => {
    const d = magasin.getAll()
    d.onsuccess = () => resoudre(d.result)
    d.onerror = () => rejeter(d.error)
  })
}

function supprimer(base, id) {
  return new Promise((resoudre) => {
    const d = transaction(base, "readwrite").delete(id)
    d.onsuccess = () => resoudre()
    d.onerror = () => resoudre()
  })
}

/**
 * Envoie un fichier en attente, puis enregistre son adresse.
 *
 * Les deux étapes comptent. Un fichier arrivé dans le coffre mais jamais
 * rattaché à un profil est un fichier que personne ne voit et que personne ne
 * sait effacer — on ne retire donc l'envoi de la file qu'une fois les deux
 * faites.
 */
async function envoyer(base, envoi) {
  const { id, supabaseUrl, jeton, clePubliable, chemin, blob, rattacherA } =
    envoi

  const reponse = await fetch(
    `${supabaseUrl}/storage/v1/object/photos/${chemin}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jeton}`,
        apikey: clePubliable,
        "Content-Type": "image/jpeg",
        "x-upsert": "false",
      },
      body: blob,
    },
  )

  // 409 : le fichier est déjà là. C'est le cas quand l'envoi avait réussi mais
  // que la réponse s'est perdue — on continue vers le rattachement plutôt que
  // de réessayer indéfiniment.
  if (!reponse.ok && reponse.status !== 409) {
    throw new Error(`storage ${reponse.status}`)
  }

  const url = `${supabaseUrl}/storage/v1/object/public/photos/${chemin}`

  const rattachement = await fetch(rattacherA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  })

  if (!rattachement.ok) throw new Error(`rattachement ${rattachement.status}`)

  await supprimer(base, id)
  await prevenirLesOnglets({ type: "envoi-termine", id, url })
}

async function viderLaFile() {
  const base = await ouvrirBase()
  const envois = await tous(transaction(base, "readonly"))

  for (const envoi of envois) {
    try {
      await envoyer(base, envoi)
    } catch {
      // On laisse l'envoi dans la file : le navigateur rappellera ce Service
      // Worker au prochain retour de connexion. Lever ici indique à
      // Background Sync qu'il faut réessayer plus tard.
      throw new Error("envoi non abouti")
    }
  }
}

async function prevenirLesOnglets(message) {
  const onglets = await self.clients.matchAll({ includeUncontrolled: true })
  for (const onglet of onglets) onglet.postMessage(message)
}

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("sync", (e) => {
  if (e.tag === "tutela-envois") e.waitUntil(viderLaFile())
})

// Certains navigateurs n'ont pas Background Sync : la page demande alors la
// reprise elle-même, à son ouverture.
self.addEventListener("message", (e) => {
  if (e.data?.type === "reprendre-envois") {
    e.waitUntil(viderLaFile().catch(() => {}))
  }
})
