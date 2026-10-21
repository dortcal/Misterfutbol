/* Service worker: permite jugar sin conexión una vez cargado el juego.
   Estrategia "red primero" para recibir siempre las actualizaciones publicadas en GitHub Pages. */
const CACHE = 'mister-futbol-v9';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/data/teams.js', 'js/data/players.js', 'js/util.js', 'js/achievements.js', 'js/db.js', 'js/sim.js', 'js/match.js', 'js/league.js',
  'js/graphics.js', 'js/render.js', 'js/audio.js', 'js/ui.js', 'js/matchui.js', 'js/manager.js', 'js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); return r; }).catch(() => caches.match(e.request)));
});
