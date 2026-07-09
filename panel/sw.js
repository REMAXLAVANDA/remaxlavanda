const CACHE = 'rmx-lavanda-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
];

// ── INSTALL: precache shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: network-first, cache fallback ──
self.addEventListener('fetch', e => {
  // Supabase API ve harici istekleri cache'leme
  const url = new URL(e.request.url);
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    e.request.method !== 'GET'
  ) {
    return; // browser default
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Başarılı yanıtı cache'e yaz
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // network yoksa cache
  );
});

// ── PUSH: bildirim göster ──
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'RE/MAX Lavanda';
  const opts = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.tag || 'rmx-notif',
    data: { url: data.url || '/' },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

// ── NOTIFICATION CLICK: sekmeyi aç/odakla ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const found = list.find(w => w.url === target && 'focus' in w);
      return found ? found.focus() : clients.openWindow(target);
    })
  );
});
