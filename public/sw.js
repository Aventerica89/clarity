/// <reference lib="webworker" />

// Cache name includes a version stamp injected at build time.
// Vercel sets NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA automatically — the
// update-prompt component passes it to the SW via a query-string on
// registration so we can detect new deploys without a custom build step.
const VERSION = new URL(self.location).searchParams.get("v") || "dev"
const CACHE_NAME = `clarity-${VERSION}`

// Assets to pre-cache on install (app shell).
const APP_SHELL = ["/", "/manifest.json"]

// Install: cache app shell. Do NOT call skipWaiting here — let the
// update prompt control activation so the banner persists until tapped.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

// Fetch: network-first for navigation and Next.js assets, cache-first
// only for explicitly pre-cached app shell resources.
self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle same-origin GET requests.
  if (request.method !== "GET") return
  if (!request.url.startsWith(self.location.origin)) return

  const url = new URL(request.url)

  // Navigation requests: always go to network (ensures fresh HTML).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    )
    return
  }

  // Next.js build assets (_next/*) and API routes: network-only.
  // Vercel CDN handles caching — the SW should never interfere.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) {
    return // Let the browser handle it directly.
  }

  // Everything else (app shell, manifest, icons): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          // Update the cache with the fresh response.
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached) // Network failed — return stale cache or undefined.

      return cached || networkFetch
    })
  )
})

// Listen for the "SKIP_WAITING" message from the update prompt.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
