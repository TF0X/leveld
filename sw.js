const CACHE = 'selfos-v1.0.7';
const BASE = self.location.pathname.replace(/sw\.js$/, '');
const SHELL = [BASE, BASE+'index.html', BASE+'css/tokens.css', BASE+'css/app.css', BASE+'js/db.js', BASE+'js/gamification.js', BASE+'js/farm.js', BASE+'js/ai.js', BASE+'js/habits.js', BASE+'js/app.js', BASE+'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.openai.com') || e.request.url.includes('generativelanguage.googleapis.com')) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    if (res.ok && e.request.url.startsWith(self.location.origin)) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return res;
  })));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow(BASE);
  }));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'skip-waiting') self.skipWaiting();
  if (e.data?.type === 'show-notif') {
    self.registration.showNotification(e.data.title, { body: e.data.body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'selfos' });
  }
});
