// Service Worker for Offline Support
// Caches app shell and handles offline requests

const CACHE_NAME = 'thisai-crm-v1'
const STATIC_CACHE = 'thisai-static-v1'
const DYNAMIC_CACHE = 'thisai-dynamic-v1'

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell...')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] App shell cached successfully')
        return self.skipWaiting() // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache app shell:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim() // Take control immediately
      })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip Firebase and external API requests
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('firestore')) {
    return
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Offline - serve from cache or fallback
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/index.html')
            })
        })
    )
    return
  }

  // Handle static assets (JS, CSS, images)
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache, but also fetch to update cache
            fetch(request).then((response) => {
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, response)
              })
            }).catch(() => {})
            return cachedResponse
          }
          
          // Not in cache - fetch and cache
          return fetch(request).then((response) => {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
            return response
          })
        })
        .catch(() => {
          // Return a fallback for images if offline
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f0f0f0" width="200" height="200"/><text x="100" y="100" text-anchor="middle" fill="#999">Offline</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            )
          }
        })
    )
    return
  }

  // Default: Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: data.data
    })
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})

// Background sync (for queued operations)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'sync-pending-operations') {
    event.waitUntil(
      // Notify the app to sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUESTED' })
        })
      })
    )
  }
})

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('[SW] Service worker loaded')









