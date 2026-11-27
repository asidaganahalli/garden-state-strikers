/**
 * GARDEN STATE STRIKERS PWA — VERSIONED SERVICE WORKER
 * Strategies:
 * 1. App Shell (index.html / navigation): Network-First with offline cache fallback
 * 2. Static Assets (css/, js/, assets/, images/): Cache-First for sub-50ms startup
 * 3. Headless JSON Data (data/*.json): Stale-While-Revalidate for instant field rendering + silent background refresh
 */

const CACHE_VERSION = 'gss-v2.2.0';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const PRECACHE_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json'
];

const PRECACHE_STATIC_URLS = [
  "./css/tokens.css",
  "./css/components.css",
  "./js/app.js",
  "./js/renderer.js",
  "./js/social-sheet.js",
  "./images/gss-logo.jpg",
  "./assets/icons/logo.webp",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/players/aaditva-agrawal.webp",
  "./assets/players/amanpreet-singh.webp",
  "./assets/players/amit-kumar.webp",
  "./assets/players/anbumani-mailathipathy.webp",
  "./assets/players/aniket-varade.webp",
  "./assets/players/anil-sidaganahalli.webp",
  "./assets/players/anish-kumar-anand.webp",
  "./assets/players/ashish-reddy-majjigapu.webp",
  "./assets/players/asif-mohammed.webp",
  "./assets/players/chethan-raghavendra.webp",
  "./assets/players/gaurish-potireddi.webp",
  "./assets/players/gurjeet-sandhu.webp",
  "./assets/players/harp-singh-multani.webp",
  "./assets/players/harsimran-singh-2483.webp",
  "./assets/players/harsimran-singh.webp",
  "./assets/players/hrishikesh-chekuri.webp",
  "./assets/players/jagdish-subramony.webp",
  "./assets/players/jatinder-singh.webp",
  "./assets/players/kapil-yadav.webp",
  "./assets/players/mahesh-kommanuru.webp",
  "./assets/players/mandeep-singh.webp",
  "./assets/players/manjinder-singh.webp",
  "./assets/players/manoj-bagul.webp",
  "./assets/players/manoj-jaitly.webp",
  "./assets/players/mrudul-ghagor.webp",
  "./assets/players/nithin-reddy-gaddam.webp",
  "./assets/players/pankaj-kumar-mishra.webp",
  "./assets/players/paresh-deshmukh.webp",
  "./assets/players/partha-radadiya.webp",
  "./assets/players/prabakaran-jayabalan.webp",
  "./assets/players/prabhjot-meet-singh.webp",
  "./assets/players/prabhjot-singh.webp",
  "./assets/players/prashant-madhukar.webp",
  "./assets/players/pravin-shukla.webp",
  "./assets/players/priyesh-bhishnurkar.webp",
  "./assets/players/raghav-gupta.webp",
  "./assets/players/ranjit-sangha.webp",
  "./assets/players/ravindar-kumar.webp",
  "./assets/players/rodricks-christian.webp",
  "./assets/players/rushil-pandya.webp",
  "./assets/players/saketh-moharir.webp",
  "./assets/players/samir-kalra.webp",
  "./assets/players/samir-patra.webp",
  "./assets/players/sampath-vijayaragavan.webp",
  "./assets/players/santosh-lalan.webp",
  "./assets/players/sasmit-chakraborty.webp",
  "./assets/players/sivakumar-arumugam.webp",
  "./assets/players/sunny-thakkar.webp",
  "./assets/players/vikramjeet-kumar.webp",
  "./assets/players/viraj-patel.webp",
  "./assets/players/waqas-akhtar.webp",
  "./assets/gallery/match-01.webp",
  "./assets/gallery/match-02.webp",
  "./assets/gallery/match-03.webp",
  "./assets/gallery/match-04.webp",
  "./assets/gallery/match-05.webp",
  "./assets/gallery/match-06.webp"
];

const PRECACHE_DATA_URLS = [
  './data/club.json',
  './data/players.json',
  './data/gallery.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(cache => cache.addAll(PRECACHE_SHELL_URLS)),
      caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_STATIC_URLS)),
      caches.open(DATA_CACHE).then(cache => cache.addAll(PRECACHE_DATA_URLS))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, STATIC_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!validCaches.has(key)) {
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.json') && url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // Use Network-First for App Shell (index.html), JS modules, and CSS so deployed code updates take effect immediately on reload
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(networkFirstShell(request));
    return;
  }

  event.respondWith(cacheFirstStatic(request));
});

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const freshResponse = await fetch(request);
    if (freshResponse && freshResponse.ok) {
      cache.put(request, freshResponse.clone());
    }
    return freshResponse;
  } catch {
    const cached =
      (await cache.match(request)) ||
      (await caches.match(request)) ||
      (request.mode === 'navigate' ? (await cache.match('./index.html')) || (await cache.match('./')) : null);
    return cached;
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(STATIC_CACHE);
  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || networkPromise;
}
