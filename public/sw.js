/// <reference lib="webworker" />

// Cache name includes a version stamp injected at build time.
// Vercel sets NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA automatically — the
// update-prompt component passes it to the SW via a query-string on
// registration so we can detect new deploys without a custom build step.
const VERSION = new URL(self.location).searchParams.get("v") || "dev"
const CACHE_NAME = `clarity-${VERSION}`

// Assets to pre-cache on install (app shell).
const APP_SHELL = ["/", "/manifest.json"]

// Install: cache app shell, then immediately take over.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// Activate: delete old caches, then claim all clients.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("clarity-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Fetch: network-first for navigation, cache-first for static assets.
self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle same-origin GET requests.
  if (request.method !== "GET") return
  if (!request.url.startsWith(self.location.origin)) return

  // Navigation requests: always go to network (ensures fresh HTML).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    )
    return
  }

  // Static assets: try cache first, fallback to network.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})

// Listen for the "SKIP_WAITING" message from the update prompt.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
