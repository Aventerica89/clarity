import { describe, it, expect, vi, beforeEach } from "vitest"

// Use vi.hoisted to declare mocks before the hoisted vi.mock() factories run
const { mockReturning, mockWhere, mockDelete } = vi.hoisted(() => {
  const mockReturning = vi.fn()
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
  const mockDelete = vi.fn().mockReturnValue({ where: mockWhere })
  return { mockReturning, mockWhere, mockDelete }
})

vi.mock("@/lib/db", () => ({
  db: {
    delete: mockDelete,
  },
}))

vi.mock("@/lib/schema", () => ({
  tasks: { userId: "userId", isCompleted: "isCompleted", completedAt: "completedAt" },
}))

// Mock drizzle-orm operators so we can inspect call arguments
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ op: "and", args }),
  eq: (col: unknown, val: unknown) => ({ op: "eq", col, val }),
  lt: (col: unknown, val: unknown) => ({ op: "lt", col, val }),
  sql: vi.fn(),
}))

import { purgeOldCompletedTasks } from "@/lib/tasks/cleanup"

describe("purgeOldCompletedTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-wire chain after clearAllMocks resets return values
    mockWhere.mockReturnValue({ returning: mockReturning })
    mockDelete.mockReturnValue({ where: mockWhere })
  })

  it("returns the count of deleted tasks", async () => {
    mockReturning.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }])

    const count = await purgeOldCompletedTasks("user-abc")

    expect(count).toBe(2)
  })

  it("returns 0 when no tasks are deleted", async () => {
    mockReturning.mockResolvedValue([])

    const count = await purgeOldCompletedTasks("user-abc")

    expect(count).toBe(0)
  })

  it("returns 1 when exactly one task is deleted", async () => {
    mockReturning.mockResolvedValue([{ id: "only-task" }])

    const count = await purgeOldCompletedTasks("user-single")

    expect(count).toBe(1)
  })

  it("calls db.delete with the tasks table", async () => {
    mockReturning.mockResolvedValue([])
    const { tasks } = await import("@/lib/schema")

    await purgeOldCompletedTasks("user-xyz")

    expect(mockDelete).toHaveBeenCalledWith(tasks)
  })

  it("filters by userId", async () => {
    mockReturning.mockResolvedValue([])
    const { tasks } = await import("@/lib/schema")

    await purgeOldCompletedTasks("user-filter-test")

    const whereArg = mockWhere.mock.calls[0][0]
    expect(whereArg.op).toBe("and")
    const eqUserId = whereArg.args.find(
      (a: { op: string; col: unknown; val: unknown }) =>
        a.op === "eq" && a.col === tasks.userId && a.val === "user-filter-test",
    )
    expect(eqUserId).toBeDefined()
  })

  it("filters by isCompleted = true", async () => {
    mockReturning.mockResolvedValue([])
    const { tasks } = await import("@/lib/schema")

    await purgeOldCompletedTasks("user-abc")

    const whereArg = mockWhere.mock.calls[0][0]
    const eqCompleted = whereArg.args.find(
      (a: { op: string; col: unknown; val: unknown }) =>
        a.op === "eq" && a.col === tasks.isCompleted && a.val === true,
    )
    expect(eqCompleted).toBeDefined()
  })

  it("filters by completedAt less than the 30-day cutoff", async () => {
    const before = Date.now()
    mockReturning.mockResolvedValue([])
    const { tasks } = await import("@/lib/schema")

    await purgeOldCompletedTasks("user-abc")

    const after = Date.now()
    const whereArg = mockWhere.mock.calls[0][0]
    const ltArg = whereArg.args.find(
      (a: { op: string; col: unknown; val: unknown }) =>
        a.op === "lt" && a.col === tasks.completedAt,
    )
    expect(ltArg).toBeDefined()

    const cutoffDate = ltArg.val as Date
    expect(cutoffDate).toBeInstanceOf(Date)

    // cutoff should be approximately 30 days ago (within a 5-second window)
    const expectedMs = 30 * 24 * 60 * 60 * 1000
    const cutoffMs = cutoffDate.getTime()
    expect(cutoffMs).toBeGreaterThanOrEqual(before - expectedMs - 5000)
    expect(cutoffMs).toBeLessThanOrEqual(after - expectedMs + 5000)
  })
})
