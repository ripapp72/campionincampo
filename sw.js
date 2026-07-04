// ── SERVICE WORKER — CampioninCampo PWA ──
const CACHE_NAME = 'campionincampo-v1';

// File da mettere in cache per uso offline
const FILES_DA_CACHE = [
  '/',
  '/index.html',
  '/home.html',
  '/style.css',
  '/script.js',
  '/supabase.js',
  '/LOGO.jpg',
  '/foto  campo con pallone.jpg'
];

// Installazione — mette in cache i file principali
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_DA_CACHE);
    })
  );
  self.skipWaiting();
});

// Attivazione — rimuove cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — prima prova rete, poi cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Salva in cache la risposta fresca
        const copia = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        return response;
      })
      .catch(() => {
        // Se offline, usa la cache
        return caches.match(event.request);
      })
  );
});
