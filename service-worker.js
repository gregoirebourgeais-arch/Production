// === Service Worker Atelier PPNC ===

const CACHE_NAME = "atelier-ppnc-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

// Installation du SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activation
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
});

// Interception des requêtes
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).catch(() =>
        new Response("⚠️ Application hors ligne", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        })
      )
    )
  );
});
