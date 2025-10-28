// === SERVICE WORKER Atelier PPNC ===
// Gère la mise en cache pour le mode hors-ligne et installation PWA

const CACHE_NAME = "atelier-ppnc-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

// INSTALLATION DU SERVICE WORKER
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  console.log("✅ Service Worker installé et fichiers mis en cache.");
});

// ACTIVATION ET MISE À JOUR DU CACHE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  console.log("♻️ Service Worker activé, anciens caches supprimés.");
});

// INTERCEPTION DES REQUÊTES
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// INSTALLATION AUTOMATIQUE
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
