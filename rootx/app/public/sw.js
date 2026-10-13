/* ROOT-X service worker — the installed app's shell.
 *
 * Honesty rules (docs/19, C-8): API responses are NEVER cached and NEVER
 * fabricated. Offline, the shell opens and the store shows the honest
 * offline/queued state — payments and code checks wait for the server.
 */
const SHELL = 'rootx-shell-v1';
const ASSETS = 'rootx-assets-v1';
const TILES = 'rootx-tiles-v1';
const TILES_MAX = 300;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(['/', '/manifest.webmanifest', '/favicon.svg']);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (![SHELL, ASSETS, TILES].includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function trimTiles(cache) {
  const keys = await cache.keys();
  if (keys.length > TILES_MAX) {
    await cache.delete(keys[0]);
    await trimTiles(cache);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  /* The API is always live. Never cached, never faked — including the SSE
   * stream. No respondWith: the browser handles it natively. */
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  /* Basemap tiles (CARTO/OSM): stale-while-revalidate, capped — the campus
   * map stays usable with a flaky connection. */
  if (url.hostname.endsWith('basemaps.cartocdn.com')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(TILES);
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).then(() => trimTiles(cache));
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })(),
    );
    return;
  }

  /* App navigations: network-first (new deploys land), cached shell when
   * offline so the installed app opens without a connection. */
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req, { cache: 'no-cache' });
          const cache = await caches.open(SHELL);
          cache.put('/', res.clone());
          return res;
        } catch {
          const cache = await caches.open(SHELL);
          return (await cache.match('/')) || Response.error();
        }
      })(),
    );
    return;
  }

  /* Same-origin static assets (hashed bundles, fonts, icons): cache-first. */
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
  }
});
