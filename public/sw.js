const CACHE_NAME = 'buildsync-v1'
const OFFLINE_URL = '/offline'
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/projects',
  '/schedule',
  '/photos',
  '/chat',
  '/work-reports',
  '/offline',
]

// install: 静的リソースをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

// activate: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// push: Web Push通知を受信して表示
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'BuildSync', {
      body: data.body || '新しい通知があります',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  )
})

// notificationclick: 通知クリック時にアプリを開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})

// fetch: キャッシュファースト戦略
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((networkResponse) => {
          return networkResponse
        })
        .catch(() => {
          return caches.match(OFFLINE_URL)
        })
    })
  )
})
