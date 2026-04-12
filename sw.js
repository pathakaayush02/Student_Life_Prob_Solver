const CACHE_NAME = "clutch-v32";
const ASSETS = [
  "/Student_Life_Prob_Solver/",
  "/Student_Life_Prob_Solver/index.html",
  "/Student_Life_Prob_Solver/app.html",
  "/Student_Life_Prob_Solver/workspace.html",
  "/Student_Life_Prob_Solver/style.css",
  "/Student_Life_Prob_Solver/api.js",
  "/Student_Life_Prob_Solver/app.js",
  "/Student_Life_Prob_Solver/logo.png",
  "/Student_Life_Prob_Solver/pwa_logo.jpg"
];

// Helper to check if request is a navigation request (HTML page)
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          request.headers.get('accept') && 
          request.headers.get('accept').includes('text/html'));
}

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      // Force clear ALL old caches first
      return Promise.all(keys.map(function(key) {
        return caches.delete(key);
      }));
    }).then(function() {
      // Then open new cache
      return caches.open(CACHE_NAME);
    })
  );
  self.clients.claim();
});

// Helper to check if URL is an API call
function isApiRequest(url) {
  return url.includes('/api/');
}

self.addEventListener("fetch", function(event) {
  const requestUrl = event.request.url;

  // Never cache API requests - always go to network
  if (isApiRequest(requestUrl)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(function(error) {
        console.error('API request failed:', error);
        // Return a generic error response for API calls
        return new Response(
          JSON.stringify({ success: false, message: 'Network error' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Network-first strategy for navigation requests (HTML pages)
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(function(response) {
        // Update cache with fresh response
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(function() {
        // Fallback to cache if network fails
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match("/Student_Life_Prob_Solver/index.html");
        });
      })
    );
  } else {
    // Cache-first strategy for static assets (CSS, JS, images)
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          return caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, response.clone());
            return response;
          });
        }).catch(function() {
          // Return offline fallback for images
          if (event.request.destination === 'image') {
            return caches.match("/Student_Life_Prob_Solver/pwa_logo.jpg");
          }
        });
      })
    );
  }
});
