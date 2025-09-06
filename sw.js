self.addEventListener('install', e=>{
  e.waitUntil(caches.open('labyrinth-v1').then(cache=>cache.addAll([
    '/',
    '/index.html',
    '/game.js',
    '/manifest.json'
  ])));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
