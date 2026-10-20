/* Service worker: la carcasa y los índices se precargan; el resto (katas y capítulos, ~66 MB en total)
   se guarda al visitarlo y se sirve de la caché, refrescándose en segundo plano. */
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`, RUNTIME = `runtime-${VERSION}`;
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'data/index.json', 'data/search.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const sameOrigin = u.origin === location.origin;
  const fonts = u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;
  e.respondWith((async () => {
    const cache = await caches.open(sameOrigin && PRECACHE.some(p => new URL(p, location).href === u.href) ? SHELL : RUNTIME);
    const hit = await caches.match(r, {ignoreSearch: r.mode === 'navigate'});
    const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') cache.put(r, res.clone()); return res }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit }
    return (await net) || (r.mode === 'navigate' ? caches.match('index.html') : Response.error());
  })());
});
