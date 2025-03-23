const CACHE_VERSION = 'v1';
const CACHE_NAME = `learnleaf-organizer-cache-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing new version...');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== expectedCache) {
                        console.log('[Service Worker] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
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
