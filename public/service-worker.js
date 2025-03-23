self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing new version...');
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.open('learnleaf-organizer-cache').then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  });
  