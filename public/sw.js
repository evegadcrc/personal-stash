// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const origin = self.location.origin;
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Stash', {
      body: data.body ?? '',
      icon: `${origin}/icon-192.png`,
      badge: `${origin}/icon-192.png`,
      data: { shareId: data.shareId, categoryName: data.categoryName, itemId: data.itemId },
      tag: data.shareId ?? 'stash-notif',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { shareId, itemId } = event.notification.data ?? {};
  const query = [itemId && `itemId=${itemId}`, shareId && `shareId=${shareId}`].filter(Boolean).join('&');
  const url = query ? `/?${query}` : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.startsWith(self.location.origin));
      if (existing) {
        // App already open — send a message so it doesn't need to reload
        existing.postMessage({ type: 'OPEN_ITEM', itemId, shareId });
        return existing.focus();
      }
      // App closed — open it with URL params so the mount effect can read them
      return clients.openWindow(url);
    })
  );
});

// ── Caching ──────────────────────────────────────────────────────────────────

const SHELL_CACHE = 'stash-shell-v3';
const STATIC_CACHE = 'stash-static-v3';

const SHELL_URLS = ['/', '/login'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API requests — always network, never cache
  if (url.pathname.startsWith('/api/')) return;

  // Next.js static assets (_next/static) — cache-first (content-hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Other _next chunks — stale-while-revalidate
  if (url.pathname.startsWith('/_next/')) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          const networkFetch = fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
          return hit || networkFetch;
        })
      )
    );
    return;
  }

  // HTML navigation — network-first, fall back to cached shell
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(SHELL_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Other static assets (icons, manifest, fonts) — cache-first
  e.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
      })
    )
  );
});
