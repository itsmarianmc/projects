const CACHE_NAME = 'shoply-v6';
const ASSETS_TO_CACHE = [
    '/shoply/',
    '/shoply/assets/icons/favicon.png',
    '/shoply/assets/icons/favicon_colored.png',
    '/shoply/assets/catcard.css',
    '/shoply/assets/cb.css',
    '/shoply/assets/cb.js',
    '/shoply/assets/popup.css',
    '/shoply/assets/popup.js',
    '/shoply/assets/req.css',
    '/shoply/assets/script.js',
    '/shoply/assets/styles.css',
    '/shoply/index.html',
    '/shoply/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://itsmarian-static.is-a.dev/fonts/font-awesome-6.7.2/css/all.min.css',
    'https://itsmarian-static.is-a.dev/global/variables.css',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                    return fetchResponse;
                }
                
                const responseToCache = fetchResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                
                return fetchResponse;
            });
        })
    );
});