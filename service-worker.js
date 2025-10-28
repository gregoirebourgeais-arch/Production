// === SERVICE WORKER – ATELIER PPNC ===
// Gestion du cache et du mode hors-ligne

const CACHE_NAME = "atelier-ppnc-cache-v1";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// === INSTALLATION ===
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// === ACTIVATION ===
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

// === INTERCEPTION DES REQUÊTES ===
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // Si trouvé dans le cache → retourne la ressource
      if (response) return response;

      // Sinon → va la chercher sur le réseau et l’ajoute au cache
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => caches.match("./index.html"));
    })
  );
});

// === MISE À JOUR FORCÉE DU CACHE ===
self.addEventListener("message", event => {
  if (event.data === "updateSW") {
    self.skipWaiting();
  }
});
