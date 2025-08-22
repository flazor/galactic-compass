/**
 * Simple Service Worker for basic offline functionality
 * Only caches local app files for offline use
 */

const CACHE_NAME = 'galactic-compass-v5';

// Install event - cache local resources only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          './',
          './main.css',
          './script.js',
          './suncalc.js',
          './aframe.min.js',
          './img/starmap_2020_1k_gal.jpg',
          './img/starmap_2020_8k_gal.jpg'
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, cache fallback for local files only
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Only intercept same-origin requests (local app files)
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with fresh version
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(event.request);
        })
    );
  }
});
