/**
 * Service Worker for Tilt Meter offline functionality
 * Caches local app files only - images handled by AssetManager
 */

import { VERSION } from './cosmic-core/src/version.js';
const CACHE_NAME = `tilt-meter-v${VERSION}`;

// Helper to send messages to main app for debug logging
function notifyClient(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_LOG', message });
    });
  });
}
const CACHE_FILES = [
  './',
  './main.css',
  './script.js', 
  './lib/suncalc.js',
  './lib/aframe.min.js'
];

// Install event - cache local resources
self.addEventListener('install', (event) => {
  notifyClient(`Installing ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        notifyClient(`Caching ${CACHE_FILES.length} files`);
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        notifyClient(`${CACHE_NAME} installed successfully`);
        self.skipWaiting();
      })
      .catch((error) => {
        notifyClient(`Install failed: ${error.message}`);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  notifyClient(`Activating ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const deletePromises = cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => {
          notifyClient(`Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        });
      
      return Promise.all(deletePromises);
    })
    .then(() => {
      notifyClient(`${CACHE_NAME} activated successfully`);
      return self.clients.claim();
    })
    .catch((error) => {
      notifyClient(`Activation failed: ${error.message}`);
    })
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin files
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh version if successful
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone))
            .catch((error) => console.warn(`[SW] Cache update failed:`, error));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when network fails
        notifyClient(`Using cache fallback for: ${event.request.url.split('/').pop()}`);
        return caches.match(event.request);
      })
  );
});
