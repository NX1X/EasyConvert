const APP_VERSION = '1.5.3';
const CACHE_NAME = `easyconvert-v${APP_VERSION}`;

// Same-origin app shell. These filenames are not fingerprinted, so they are
// served network-first: the network copy always wins and the cache is only an
// offline fallback. Cache-first here would pin a stale build (or, after a
// one-shot script execution, an attacker-poisoned one) until CACHE_NAME
// happened to change.
const APP_SHELL = [
  '/',
  '/index.html',
  `/style.css?v=${APP_VERSION}`,
  `/app.js?v=${APP_VERSION}`,
  '/manifest.json',
  '/easyconvert-logo.svg',
  '/easyconvert-icon.svg',
  '/favicon-32.png',
  '/favicon-16.png',
  '/apple-touch-icon.png',
  '/nx1xlab-logo.png',
  // Self-hosted pdf.js and SheetJS (formerly loaded from a CDN). Same
  // network-first treatment as app.js/style.css: not fingerprinted, so a
  // version bump must actually take effect rather than staying cached.
  '/vendor/pdf.min.js',
  '/vendor/pdf.worker.min.js',
  '/vendor/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Only same-origin requests are cached or served from cache. Everything
  // else goes straight to the network so a failed request never gets
  // answered with an unrelated cached response.
  if (new URL(request.url).origin !== self.location.origin) return;

  // App shell: network first, cache only as an offline fallback. ignoreSearch
  // lets a cached '/app.js?v=1.5.1' entry still answer an '/app.js?v=1.5.2'
  // request while offline. A failed navigation falls back to the cached shell;
  // a failed sub-resource does not, so it never receives HTML.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then(cached => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/index.html');
          return Response.error();
        }))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});
