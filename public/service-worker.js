self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing new version...');
    event.waitUntil(self.skipWaiting()); // Skip waiting and immediately activate
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(self.clients.claim()); // Take control of all pages
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.open('learnleaf-organizer-cache').then((cache) => {
        return fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request));
      })
    );
  });
  