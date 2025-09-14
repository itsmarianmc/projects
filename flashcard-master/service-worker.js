const CACHE_NAME = 'shoply-v5';
const ASSETS_TO_CACHE = [
    'favicon.png',
    'index.html',
    'script.js',
    'share.css',
    'share.js',
    'styles.css',
    'manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://itsmarian-static.is-a.dev/fonts/font-awesome-6.7.2/css/all.min.css',
    'https://itsmarian-static.is-a.dev/global/variables.css'
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
    event.respondWith(
        caches.match(event.request).then(response => 
            response || fetch(event.request)
        )
    );
});

self.addEventListener('push', event => {
    const data = event.data.json();

    event.waitUntil(
        self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/assets/icons/favicon_colored.png',
        badge: '/assets/icons/favicon.png',
        })
    );
});