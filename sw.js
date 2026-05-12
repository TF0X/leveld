// leveld service worker — cache-first app shell, network-first for quotes API.
const VERSION = 'leveld-v1.3.0';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/animations.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/gemini.js',
  './js/gamification.js',
  './js/graph.js',
  './js/meals.js',
  './js/workouts.js',
  './js/hobbies.js',
  './js/habits.js',
  './js/quotes.js',
  './js/export.js',
  './js/addany.js',
  './js/challenges.js',
  './js/notifications.js',
  './js/skills.js',
  './js/savage.js',
  './js/fooddb.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Hosts that should always go network-first (quotes API, etc.)
const NETWORK_FIRST_HOSTS = ['dummyjson.com'];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for shell, network-first for quotes API ───────────────
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Network-first for quotes / external data APIs (stale fallback)
  if (NETWORK_FIRST_HOSTS.some((h) => url.hostname.includes(h))) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin only — never intercept cross-origin non-API requests
  if (url.origin !== self.location.origin) return;

  // Cache-first for app shell
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(VERSION).then((c) => c.put(req, res.clone()));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── Notification click: focus/open app ──────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      if (c.url.includes(self.registration.scope) && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(self.registration.scope);
  })());
});

// ── Periodic background sync — savage hourly nudge ──────────────────────────
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'leveld-savage') {
    e.waitUntil(self.registration.showNotification('leveld', {
      body: 'Still slacking? Open the app and log something.',
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      tag: 'leveld-savage-bg',
      renotify: true,
      data: { type: 'savage' },
    }));
  }
});

// ── Message from page — show notification from SW context ───────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'savage-notif') {
    const { title, body } = e.data;
    self.registration.showNotification(title || 'leveld', {
      body: body || 'Log something. Now.',
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      tag: 'leveld-savage-msg',
      renotify: true,
      data: { type: 'savage' },
    });
  }
  if (e.data?.type === 'skip-waiting') {
    self.skipWaiting();
  }
});
