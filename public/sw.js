// HOARD PWA Service Worker v2.0.0 — High-Performance Offline & Fast Caching Engine
const CACHE_VERSION = 'hoard-v2.0.0';
const STATIC_CACHE = `hoard-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `hoard-runtime-${CACHE_VERSION}`;
const API_CACHE = `hoard-api-${CACHE_VERSION}`;

const MAX_RUNTIME_ITEMS = 100;
const MAX_API_ITEMS = 60;

// Essential app shell assets pre-cached on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/screenshot-wide.png',
  '/screenshot-narrow.png',
];

// Helper to limit cache size using LRU deletion
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
    }
  } catch (err) {
    console.warn('[SW] trimCache failed:', err);
  }
}

// Install Event — Pre-cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        // Use individual adds so one failing optional resource doesn't break the entire pre-cache
        return Promise.all(
          PRECACHE_ASSETS.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`[SW] Precache failed for ${url}:`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event — Clean up stale legacy caches and claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Message Event — Handle Skip Waiting and Cache Operations from UI
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    });
  }
});

// Fetch Event — Tiered caching strategies for documents, Next.js static assets, and APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 0. Completely ignore localhost / dev server and Turbopack hot reload chunks
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // 1. Ignore non-GET requests or unsupported schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // 2. Ignore browser extension or analytics requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 3. Immutable Next.js static bundles & fonts in production — Cache-First with revalidate
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || Response.error();
        }
      })
    );
    return;
  }

  // 4. API Read Requests (GET /api/*) — Network-First with Stale Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    // Only cache safe GET endpoints (bookmarks, collections, til, scratch, todos, stats, atlas)
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.status === 200 && request.method === 'GET') {
            const copy = response.clone();
            caches.open(API_CACHE).then(async (cache) => {
              await cache.put(request, copy);
              trimCache(API_CACHE, MAX_API_ITEMS);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Never return HTML for an API request! Return a clean JSON 503 error
          return new Response(
            JSON.stringify({
              offline: true,
              error: 'HOARD is currently offline. This data has not been cached yet.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // 5. HTML Navigation / Document requests — Network-First with Offline Fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(async (cache) => {
              await cache.put(request, copy);
              trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
            });
          }
          return response;
        })
        .catch(async () => {
          // Check if current page is in cache
          const cached = await caches.match(request);
          if (cached) return cached;

          // Check if root index '/' is in cache
          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;

          // Fall back to dedicated offline.html page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          return new Response('HOARD is offline. Please reconnect to access this page.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 6. Generic Assets (images, SVGs, CSS, etc.) — Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then(async (networkResponse) => {
          // Avoid caching HTTP 206 Partial Content (e.g. audio/video streams)
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const copy = networkResponse.clone();
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, copy);
            trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
