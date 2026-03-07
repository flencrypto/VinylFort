/**
 * VinylVault Service Worker
 * Enables offline support and satisfies the Android PWA install criteria.
 *
 * Strategy:
 *   - App shell (HTML, CSS, JS, icons, fonts) → Cache-first with network fallback
 *   - API/third-party requests → Network-first with cache fallback
 */

const CACHE_VERSION = 'vinylvault-v2';

/** App-shell assets to pre-cache on install */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/deals.html',
  '/collection.html',
  '/settings.html',
  '/style.css',
  '/script.js',
  '/collection.js',
  '/deals.js',
  '/manifest.json',
  '/static/favicon.ico',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/icon-512-maskable.png',
  '/static/icon-192.svg',
  '/static/icon-512.svg',
  '/static/screenshot-mobile.svg',
  '/static/screenshot-desktop.svg',
  '/components/vinyl-nav.js',
  '/components/vinyl-footer.js',
  '/components/deal-scanner.js',
  '/components/deal-finder.js',
  '/components/discogs-service.js',
  '/components/ebay-service.js',
  '/components/collection-service.js',
  '/components/ai-chat.js',
  '/components/deepseek-service.js',
  '/components/enhanced-ocr-service.js',
  '/components/ocr-service.js',
  '/components/pricecharting-service.js',
  '/components/stat-card.js',
  '/components/telegram-service.js',
  '/components/bitcoin-service.js',
  '/components/solana-service.js',
  '/components/web3-service.js',
  '/components/multiversx-service.js',
  '/futuristic-features.js',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

/** Returns true when `hostname` exactly equals `domain` or is a subdomain of it. */
function matchesHost(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests that are clearly API calls
  const isThirdPartyApi =
    matchesHost(url.hostname, 'ebay.com') ||
    matchesHost(url.hostname, 'discogs.com') ||
    matchesHost(url.hostname, 'pricecharting.com') ||
    matchesHost(url.hostname, 'deepseek.com') ||
    matchesHost(url.hostname, 'telegram.org');

  if (isThirdPartyApi) {
    // Network-only for live API data
    event.respondWith(fetch(request));
    return;
  }

  // Fonts / CDN assets – stale-while-revalidate
  const isCdnAsset =
    matchesHost(url.hostname, 'fonts.googleapis.com') ||
    matchesHost(url.hostname, 'fonts.gstatic.com') ||
    matchesHost(url.hostname, 'tailwindcss.com') ||
    matchesHost(url.hostname, 'jsdelivr.net') ||
    matchesHost(url.hostname, 'cloudflare.com') ||
    matchesHost(url.hostname, 'unpkg.com') ||
    matchesHost(url.hostname, 'imgbb.com');

  if (isCdnAsset) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // App-shell & same-origin assets – cache-first
  event.respondWith(cacheFirst(request));
});

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a minimal offline page if available
    const fallback = await caches.match('/index.html');
    return fallback || new Response('Offline – VinylVault', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}
