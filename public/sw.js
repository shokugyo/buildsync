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
