import { describe, it, expect, vi } from "vitest"

// Mock db so coach.ts can be imported without a live database connection
vi.mock("@/lib/db", () => ({
  db: {},
}))

// Mock crypto module (also imported by coach.ts transitively)
vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn(),
}))

import { formatLifeContext } from "../coach"

describe("formatLifeContext", () => {
  it("returns empty string when no items and no snapshot", () => {
    expect(formatLifeContext([], null)).toBe("")
  })

  it("formats a critical item with CRITICAL label", () => {
    const result = formatLifeContext(
      [{ title: "Fix motorcycle", description: "Blocking move", urgency: "critical" as const }],
      null,
    )
    expect(result).toContain("CRITICAL: Fix motorcycle")
    expect(result).toContain("Blocking move")
  })

  it("formats an active item with ACTIVE label", () => {
    const result = formatLifeContext(
      [{ title: "Job hunting", description: "Need RV hookup", urgency: "active" as const }],
      null,
    )
    expect(result).toContain("ACTIVE: Job hunting")
  })

  it("formats financial snapshot with computed runway in months", () => {
    const result = formatLifeContext([], {
      bankBalanceCents: 320000,
      monthlyBurnCents: 140000,
      notes: null,
    })
    expect(result).toContain("Bank: $3,200")
    expect(result).toContain("Burn: $1,400/mo")
    expect(result).toContain("~2.3 months")
  })

  it("orders critical items before active items", () => {
    const result = formatLifeContext(
      [
        { title: "Job hunting", description: "", urgency: "active" as const },
        { title: "Fix motorcycle", description: "", urgency: "critical" as const },
      ],
      null,
    )
    expect(result.indexOf("CRITICAL")).toBeLessThan(result.indexOf("ACTIVE"))
  })
})
