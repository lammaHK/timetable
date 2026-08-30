/* TimeTable service worker.
   Strategy:
   - navigation (HTML): network-first, cache fallback (always fresh app shell)
   - static assets: stale-while-revalidate (serve fast, update in background)
   - old caches are purged on activate; clients auto-reload once when a new SW takes over. */
const VERSION = 'v2'
const CACHE = 'timetable-' + VERSION

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        // Reload open clients once so they pick up the fresh shell immediately.
        self.clients.matchAll({ type: 'window' }).then((clients) =>
          clients.map((c) => c.navigate(c.url)),
        ),
      ),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  // Navigation: network-first, fall back to cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
    )
    return
  }

  // Static assets: stale-while-revalidate — serve cached instantly, refresh in background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})