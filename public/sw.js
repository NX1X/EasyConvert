const APP_VERSION = '1.5.2';
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
  '/nx1xlab-logo.png'
];

// Version-pinned CDN libraries. The URL changes whenever the version does, so
// these are safe to serve cache-first. The two script-tag libraries are also
// SRI-verified by the browser on every use, cached or not.
const CDN_LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.concat(CDN_LIBS)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (CDN_LIBS.indexOf(request.url) !== -1) {
    // Immutable versioned URL: cache first, network only on a miss.
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }

  // Only same-origin requests are cached or served from cache. Cross-origin
  // ones (Turnstile, the analytics beacon) go straight to the network so a
  // failed request never gets answered with an unrelated cached response.
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
