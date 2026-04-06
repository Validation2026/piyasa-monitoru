const CACHE = 'piyasa-v3';

self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Data ve API istekleri: her zaman network, cache yok
    if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/api/')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // HTML sayfaları: network first, 3sn timeout, cache fallback
    if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        e.respondWith(
            Promise.race([
                fetch(e.request),
                new Promise((_, reject) => setTimeout(reject, 3000))
            ]).then(r => {
                if (r.ok) {
                    const clone = r.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return r;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // CSS, JS, font: stale-while-revalidate
    e.respondWith(
        caches.match(e.request).then(cached => {
            const fetched = fetch(e.request).then(r => {
                if (r.ok) {
                    const clone = r.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return r;
            }).catch(() => cached);

            return cached || fetched;
        })
    );
});
