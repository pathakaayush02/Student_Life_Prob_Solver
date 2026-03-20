const CACHE_NAME = "clutch-v1";
const ASSETS = [
  "/Student_Life_Prob_Solver/",
  "/Student_Life_Prob_Solver/index.html",
  "/Student_Life_Prob_Solver/workspace.html",
  "/Student_Life_Prob_Solver/style.css",
  "/Student_Life_Prob_Solver/app.js",
  "/Student_Life_Prob_Solver/logo.png"
];

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
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(function() {
        return caches.match("/Student_Life_Prob_Solver/index.html");
      });
    })
  );
});
