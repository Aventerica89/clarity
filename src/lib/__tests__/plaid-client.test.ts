import { describe, it, expect, vi } from "vitest"

describe("createPlaidClient", () => {
  it("throws if PLAID_CLIENT_ID is missing", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "sandbox")
    vi.resetModules()

    const { createPlaidClient } = await import("../plaid")
    expect(() => createPlaidClient()).toThrow("PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV must be set")
    vi.unstubAllEnvs()
  })

  it("throws if PLAID_ENV is invalid", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "test-id")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "invalid-env")
    vi.resetModules()

    const { createPlaidClient } = await import("../plaid")
    expect(() => createPlaidClient()).toThrow("Invalid PLAID_ENV")
    vi.unstubAllEnvs()
  })

  it("returns PlaidApi instance when env vars are valid", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "test-id")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "sandbox")
    vi.resetModules()

    const { createPlaidClient } = await import("../plaid")
    const client = createPlaidClient()
    expect(client).toBeDefined()
    expect(typeof client.linkTokenCreate).toBe("function")
    vi.unstubAllEnvs()
  })
})
