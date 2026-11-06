// Offline support. The build fills in the version and the list of files to keep.
const CACHE = "decision-club-__VERSION__";
const PRECACHE = /* __PRECACHE__ */ [];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("decision-club-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Page itself: network first so new versions show up, cached copy when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./", copy));
          return response;
        })
        .catch(() => caches.match("./", { ignoreVary: true })),
    );
    return;
  }
  // Built files have content hashes in their names, so a cached copy is always current.
  // ignoreVary: script requests carry an Origin header that the precache requests did not.
  event.respondWith(
    caches
      .match(request, { ignoreVary: true })
      .then((hit) => hit || fetch(request)),
  );
});
