
// A basic service worker
self.addEventListener('fetch', function(event) {
  // Respond with a simple fetch
  event.respondWith(fetch(event.request));
});
