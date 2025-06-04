self.addEventListener("install", event => {
	event.waitUntil(
		caches.open("ntrack-cache").then(cache => {
			return cache.addAll([
				"favicon-dark.png",
				"favicon-light.png",
				"index.html",
				"styles.css",
				"script.js",
				"manifest.json"
			]);
		}).catch(err => {
			console.error("Cache error during install:", err);
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
