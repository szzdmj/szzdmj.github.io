// sw.js (Service Worker file)
const CACHE_NAME = "static-cache-v3";
const STATIC_ASSETS = [
  "book_html/风雨天地行.html",
  "book_html/风雨天地行.epub",
  "book_html/风雨天地行.chm",
  "/r4.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.log("Cache failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME;
          })
          .map((name) => {
            return caches.delete(name);
          })
      );
    })
  );
});

// Fetch event - serve from cache or fetch from network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          console.log("Found in cache!");
          return response;
        }

        // Fetch from network if not in cache
        return fetch(event.request).then((networkResponse) => {
          // Optionally cache new responses dynamically
          if (
            event.request.method === "GET" &&
            networkResponse.status === 200
          ) {
            console.log("Not in cache, caching...");
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Fallback if both cache and network fail
        return caches.match("/offline.html");
      })
  );
});

