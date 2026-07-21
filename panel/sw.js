// Push bildirimleri için minimal service worker — offline cache/PWA
// stratejisi YOK, sadece push event'lerini karşılayıp bildirim gösteriyor.
// /panel/ scope'unda register edilir (bkz. lib/push.js).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = data.title || 'RE/MAX Lavanda Portal'
  const options = {
    body: data.body || '',
    icon: '/panel/icon-192.png',
    badge: '/panel/icon-192.png',
    data: { url: data.url || '/panel/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/panel/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/panel/') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
