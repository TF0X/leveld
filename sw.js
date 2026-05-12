// leveld service worker — cache-first app shell.
const VERSION = 'leveld-v1.2.3';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/animations.css',
  './js/app.js',
  './js/db.js',
  './js/gemini.js',
  './js/gamification.js',
  './js/graph.js',
  './js/meals.js',
  './js/workouts.js',
  './js/hobbies.js',
  './js/export.js',
  './js/ui.js',
  './js/addany.js',
  './js/challenges.js',
  './js/notifications.js',
  './js/skills.js',
  './js/savage.js',
  './js/fooddb.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.registration.scope) && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(self.registration.scope);
  })());
});

// Periodic background sync — fires hourly savage notification if savage mode on.
// Requires PWA install + Chrome's periodic background sync permission.
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'leveld-savage') {
    e.waitUntil(self.registration.showNotification('leveld', {
      body: 'Still slacking? Open the app and log something.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'leveld-savage-bg',
      renotify: true,
      data: { type: 'savage' },
    }));
  }
});

// Message from app page — show a notification immediately from the SW context.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'savage-notif') {
    const { title, body } = e.data;
    self.registration.showNotification(title || 'leveld', {
      body: body || 'Log something. Now.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'leveld-savage-msg',
      renotify: true,
      data: { type: 'savage' },
    });
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache Gemini API or other cross-origin POSTs
  if (url.origin !== location.origin && !url.hostname.includes('gstatic') && !url.hostname.includes('googleapis.com/css')) {
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
