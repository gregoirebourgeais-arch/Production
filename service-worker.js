// ===== SERVICE WORKER - SYNTHÈSE ATELIER =====

const CACHE_NAME = "synthese-lactalis-v1";
const URLS_A_CACHER = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installation du Service Worker et mise en cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📦 Mise en cache initiale");
      return cache.addAll(URLS_A_CACHER);
    })
  );
  self.skipWaiting();
});

// Activation du Service Worker et nettoyage des anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).then(resp => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        return resp;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
