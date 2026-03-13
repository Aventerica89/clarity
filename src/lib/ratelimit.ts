/**
 * @fileoverview Upstash Redis rate limiters for all public API surfaces.
 *
 * Each limiter uses a sliding-window algorithm keyed by a unique prefix.
 * Limits are intentionally conservative — Plaid, AI, and sync endpoints
 * call expensive external APIs that must be protected from abuse.
 *
 * Usage: `const { success } = await coachRatelimit.limit(identifier)`
 */
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

/** Rate limiter for Plaid Link and transaction sync endpoints (20 req/min). */
export const plaidRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:plaid",
})

/** Rate limiter for the AI coach streaming endpoint (30 req/min). */
export const coachRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:coach",
})

/** Rate limiter for authentication endpoints to mitigate brute-force attacks (10 req/min). */
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth",
})

/** Rate limiter for the Todoist webhook receiver (60 req/min). */
export const todoistWebhookRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:todoist-wh",
})

/** Rate limiter for general AI inference endpoints (20 req/min). */
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:ai",
})

/** Rate limiter for on-demand triage scans (5 req/min). */
export const triageScanRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:triage-scan",
})

// Manual sync endpoints (Gmail, Todoist, Google Calendar) — external API calls
export const syncRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:sync",
})

// Weather widget — proxies to OpenWeatherMap API
export const weatherRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:weather",
})
