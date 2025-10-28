// ================================
// SERVICE WORKER – Atelier PPNC
// ================================
const CACHE_NAME = "atelier-ppnc-v1";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "icon-192.png",
  "icon-512.png",
  "logo-lactalis.png",
  "manifest.json",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

// ---------- Installation ----------
self.addEventListener("install", event => {
  console.log("📦 Installation du service worker…");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ---------- Activation ----------
self.addEventListener("activate", event => {
  console.log("✅ Service Worker activé !");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// ---------- Fetch (mode hors-ligne) ----------
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request)
          .then(res => {
            // mise en cache à la volée
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, res.clone());
              return res;
            });
          })
          .catch(() =>
            caches.match("index.html") // fallback
          )
      );
    })
  );
});
