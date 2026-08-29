const CACHE_NAME = 'foodtreknow-shell-v13';
const APP_SHELL = [
  './',
  './index.html',
  './terms.html',
  './privacy.html',
  './manifest.webmanifest',
  './assets/foodtreknow-logo.png',
  './css/vendor.css',
  './css/vendor-reports.css',
  './css/vendor-settings.css',
  './css/opportunity-marketplace.css',
  './css/customer-account.css',
  './css/customer-ordering.css',
  './css/beta-banner.css',
  './css/legal.css',
  './js/app.js',
  './js/customer-account.js',
  './js/customer-marketplace.js',
  './js/opportunity-marketplace.js',
  './js/customer-payments.js',
  './js/live-location.js',
  './js/live-orders.js',
  './js/supabase-auth.js',
  './js/supabase-client.js',
  './js/supabase-config.js',
  './js/vendor-auth.js',
  './js/vendor-data.js',
  './js/vendor-onboarding.js',
  './js/vendor-payments.js',
  './js/vendor-subscription.js',
  './js/vendor-reports.js',
  './js/vendor-location.js',
  './js/vendor-settings.js',
  './js/beta-banner.js',
  './js/pwa.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    const offlinePage = url.pathname.endsWith('/terms.html')
      ? './terms.html'
      : url.pathname.endsWith('/privacy.html')
        ? './privacy.html'
        : './index.html';
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(offlinePage, copy));
          return response;
        })
        .catch(() => caches.match(offlinePage))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
