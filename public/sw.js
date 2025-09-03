
// A basic service worker
const CACHE_NAME = 'paisa-view-v1';
const STATIC_CACHE = 'paisa-view-static-v1';
const DYNAMIC_CACHE = 'paisa-view-dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle offline functionality
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests (Firestore, etc.)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('API request failed, checking cache:', error);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline mode - data will sync when online',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Navigation request failed, checking cache:', error);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return caches.match('/offline');
  }
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Static asset request failed, checking cache:', error);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a basic offline response
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    console.log('Performing background sync...');
    
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients about background sync
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_STARTED',
        timestamp: Date.now()
      });
    });
    
    // Here you would implement the actual sync logic
    // This would integrate with your OfflineSyncManager
    
    console.log('Background sync completed');
    
    // Notify clients about successful sync
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETED',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('Background sync failed:', error);
    
    // Notify clients about failed sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_FAILED',
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    // Trigger background sync
    self.registration.sync.register('background-sync');
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from Paisa View',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Paisa View', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
