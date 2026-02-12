// Service Worker: Web Push 通知受信
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'リマインダー';
    const options = {
      body: data.body || '',
      data: { url: data.url || '/' },
      tag: data.tag || 'reminder',
      renotify: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    event.waitUntil(
      self.registration.showNotification('リマインダー', { body: '新しい通知があります' })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then((c) => c?.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(new URL(url, self.location.origin).href);
      }
    })
  );
});
