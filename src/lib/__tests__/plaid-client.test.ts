import { describe, it, expect, vi, afterEach } from "vitest"
import { Products, CountryCode } from "plaid"

describe("createPlaidClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("throws if PLAID_CLIENT_ID is missing", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "sandbox")

    const { createPlaidClient } = await import("../plaid")
    expect(() => createPlaidClient()).toThrow("PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV must be set")
  })

  it("throws if PLAID_ENV is invalid", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "test-id")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "invalid-env")

    const { createPlaidClient } = await import("../plaid")
    expect(() => createPlaidClient()).toThrow("Invalid PLAID_ENV")
  })

  it("returns PlaidApi instance when env vars are valid", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "test-id")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "sandbox")

    const { createPlaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } = await import("../plaid")
    const client = createPlaidClient()
    expect(client).toBeDefined()
    expect(typeof client.linkTokenCreate).toBe("function")
    expect(PLAID_PRODUCTS).toEqual([Products.Transactions])
    expect(PLAID_COUNTRY_CODES).toEqual([CountryCode.Us])
  })
})
