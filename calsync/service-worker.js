const CACHE = 'calsync-v1';
const ASSETS = [
	'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap',
	'./',
	'./auth.js',
	'./favicon.png',
	'./index.html',
	'./notes.js',
	'./onboarding.js',
	'./script.js',
	'./settings.js',
	'./styles.css',
	'./tooltip.js'
];

self.addEventListener('install', e => {
	e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
	self.skipWaiting();
});

self.addEventListener('activate', e => {
	e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
	self.clients.claim();
});

self.addEventListener('fetch', e => {
	const url = e.request.url;
	if (url.includes('supabase.co') || url.includes('discord.com') || url.includes('googleapis.com') || url.includes('openfoodfacts.org')) {
		e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
		return;
	}
	e.respondWith(
		caches.match(e.request).then(cached => {
			if (cached) return cached;
			return fetch(e.request).then(res => {
				if (!res || res.status !== 200 || res.type !== 'basic') return res;
				const clone = res.clone();
				caches.open(CACHE).then(cache => cache.put(e.request, clone));
				return res;
			}).catch(() => caches.match('./index.html'));
		})
	);
});