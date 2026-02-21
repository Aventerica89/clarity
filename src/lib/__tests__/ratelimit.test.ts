import { describe, it, expect, vi } from "vitest"

describe("ratelimit module", () => {
  it("exports limiters with limit function", async () => {
    // Provide stub env so module can initialize
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://stub.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "stub-token")
    vi.resetModules()
    const mod = await import("../ratelimit")
    expect(typeof mod.plaidRatelimit.limit).toBe("function")
    expect(typeof mod.coachRatelimit.limit).toBe("function")
    expect(typeof mod.authRatelimit.limit).toBe("function")

    vi.unstubAllEnvs()
  })
})
