const VERSION = 'bb-v2';

// Derive the base path from the SW scope (e.g. https://.../bobs-builds/)
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname : SCOPE_URL.pathname + '/';

// Build asset URLs relative to BASE so it works on forks/renames
const ASSETS = [
  '',                // BASE itself (serves index.html on GH Pages)
  'index.html',
  'assets/styles.css',
  'assets/include.js',
  'assets/main.js',
  'assets/products.json',
  // add icons/manifest if you want them precached:
  'assets/manifest.webmanifest',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png'
].map(p => BASE + p);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first for HTML; cache-first for other assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(VERSION);
          // Try cached page first
          const cached = await cache.match(req);
          if (cached) return cached;
          // Fallback to cached index.html
          return cache.match(BASE + 'index.html') || Response.error();
        })
    );
    return;
  }

  // For CSS/JS/images: cache-first, then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      });
    })
  );
});
