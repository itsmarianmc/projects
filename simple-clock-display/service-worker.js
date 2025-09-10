self.addEventListener("install", event => {
    event.waitUntil(
        caches.open("simple-clock-cache").then(cache => {
        return cache.addAll([
            "./",
            "./favicon.png",
            "./index.html",
            "./manifest.json",
            "./script.js",
            "./style.css"
        ]);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
        return response || fetch(event.request);
        })
    );
});