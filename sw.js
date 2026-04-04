const CACHE = 'piyasa-v1';
const ASSETS = ['/', '/index.html', '/assets/css/style.css', '/assets/js/sidebar.js', '/assets/js/app.js'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
    // Network first, cache fallback
    e.respondWith(
        fetch(e.request).then(r => {
            if (r.ok) {
                const clone = r.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return r;
        }).catch(() => caches.match(e.request))
    );
});
