const CACHE = '637vib-v2.37-stable';
const ASSETS = [
  '/',
  './index.html',
  './style.css',
  './app.js',
  './firebase-config.js',
  './dashboard.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  // Exclude Firebase and external calls from cache-first strategy if needed
  if (e.request.url.includes('firestore') || e.request.url.includes('google-analytics')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
