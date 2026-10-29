const CACHE_NAME = 'pastef-kmn-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch for dynamic live Supabase calls
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
