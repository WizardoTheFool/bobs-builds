const VERSION = 'bb-v3';

// Base path from scope (works on GitHub Pages and forks)
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname : (SCOPE_URL.pathname + '/');

// Core assets to precache
const PRECACHE_ASSETS = [
  'offline.html',
  '',                    // BASE itself (GH Pages serves index.html)
  'index.html',
  'assets/styles.css',
  'assets/include.js',
  'assets/main.js',
  'assets/products.json',
  'assets/manifest.webmanifest',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png'
].map(p => BASE + p);

// ----- Install / Activate ----------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(PRECACHE_ASSETS).catch(()=>{});
    // Precache product images (best effort)
    try {
      const res = await fetch(BASE + 'assets/products.json', { cache: 'no-cache' });
      const data = await res.json();
      const imgs = (data.products || []).flatMap(p => [p.thumb, ...(p.gallery || [])]);
      await cache.addAll(imgs.map(src => src.startsWith('http') ? src : (BASE + src.replace(/^\//,''))));
    } catch {}
    // Navigation preload for faster HTML
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable().catch(()=>{});
    }
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

// Allow page to tell SW to activate immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ----- Fetch strategy --------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only same-origin
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Only GET is cacheable
  if (req.method !== 'GET') return;

  // HTML: network-first (with preload), fallback to cache then index.html
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith((async () => {
      try {
        // Navigation preload if available
        const preload = await event.preloadResponse;
        const netRes = preload || await fetch(req);
        // only cache good responses
        if (netRes && netRes.ok) {
          const copy = netRes.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return netRes;
      } catch {
        const cache = await caches.open(VERSION);
        return (await cache.match(req)) ||
               (await cache.match(BASE + 'index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // Assets (CSS/JS/images/json): cache-first, then network with background update
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // Cache successful, same-origin responses
      if (res && res.ok && res.type !== 'opaque') {
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      // As a last resort, try index.html for same-origin navigations to subpaths
      return (await cache.match(BASE + 'index.html')) || Response.error();
    }
  })());
});


/* Offline navigate fallback */
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(event.request);
      } catch (err) {
        const cache = await caches.open(VERSION);
        const offline = await cache.match(BASE + 'offline.html');
        if (offline) return offline;
        throw err;
      }
    })());
  }
});
