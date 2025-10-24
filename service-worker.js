/* ==============================
   Service Worker - Synthèse Atelier PPNC
   Permet la mise en cache et le mode offline
============================== */

const CACHE_NAME = "synthese-ppnc-v1";
const FILES_TO_CACHE = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("🧩 Mise en cache des fichiers");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() =>
          caches.match("./index.html")
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Suppression de l'ancien cache :", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});
