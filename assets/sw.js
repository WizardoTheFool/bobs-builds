const CACHE = 'bb-v1';
const ASSETS = [
  '/bobs-builds/',
  '/bobs-builds/index.html',
  '/bobs-builds/assets/styles.css',
  '/bobs-builds/assets/include.js',
  '/bobs-builds/assets/main.js',
  '/bobs-builds/assets/products.json'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy));
      return res;
    }).catch(()=> caches.match('/bobs-builds/index.html')))
  );
});
