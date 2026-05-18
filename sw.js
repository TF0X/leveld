const VERSION = 'leveld-v2.1.0';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/reset.css',
  './css/components.css',
  './css/utilities.css',
  './css/animations.css',
  './js/app.js',
  './js/db.js',
  './js/export.js',
  './js/gamification.js',
  './js/gemini.js',
  './js/graph.js',
  './js/habits.js',
  './js/hobbies.js',
  './js/meals.js',
  './js/notifications.js',
  './js/search.js',
  './js/shred.js',
  './js/templates.js',
  './js/theme.js',
  './js/ui.js',
  './js/water.js',
  './js/workouts.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'skip-waiting') self.skipWaiting();
});
