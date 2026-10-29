// Service Worker minimal PWA - Strict No-Cache pour les appels API et données en direct
const CACHE_NAME = 'pastef-kmn-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Tout appel API ou Supabase va DIRECTEMENT sur le réseau sans passer par aucun cache
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Pour les autres requêtes, passer directement
  event.respondWith(fetch(event.request));
});
