// Service worker: permite usar la app sin conexión.
// Cambia el número de versión cada vez que subas cambios a GitHub.
const CACHE = 'pizarra-v12';
const ASSETS = [
  './', 'index.html', 'css/style.css', 'js/db.js', 'js/drills.js', 'js/method.js', 'js/objects.js', 'js/zones.js', 'js/tactics.js', 'js/importer.js', 'js/video.js', 'js/app.js', 'js/session.js', 'js/plan.js', 'js/squad.js', 'js/care.js', 'js/matches.js', 'js/perf.js', 'js/home.js', 'js/pdf.js', 'js/exlib.js', 'js/brand.js', 'js/android.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo-dt.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la red (para recibir actualizaciones); si no hay conexión, la copia guardada.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
