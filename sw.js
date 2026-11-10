// Offline-Cache für das Reise-Dashboard
const V = 'mexiko-reise-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all([
    ...CORE.map(u => c.add(u).catch(() => {})),
    ...LIBS.map(u => fetch(new Request(u, {mode: 'no-cors'})).then(r => c.put(u, r)).catch(() => {}))
  ])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google Maps nie cachen (Nutzungsbedingungen) – offline greift die eingebaute Karte
  if (/googleapis\.com$|gstatic\.com$|google\.com$/.test(url.hostname) && !/^fonts\./.test(url.hostname)) return;
  // Seite selbst: zuerst Netz (neuester Stand), sonst Cache
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // Bibliotheken, Schriften, Icons: zuerst Cache
  if (url.origin === location.origin || /cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); return r; })));
  }
});
