import { describe, it, expect } from "vitest"
import { scoreTodoistTask } from "../score-structured"

describe("scoreTodoistTask", () => {
  it("returns valid score for normal priority with no due date", () => {
    const result = scoreTodoistTask({ priority: 1, dueDate: null, title: "Buy groceries" })
    expect(result.score).toBe(20)
    expect(result.reasoning).toContain("normal")
  })

  it("returns valid score for urgent priority with no due date", () => {
    const result = scoreTodoistTask({ priority: 4, dueDate: null, title: "Fix prod" })
    expect(result.score).toBe(40)
    expect(result.reasoning).toContain("urgent")
  })

  it("boosts score for overdue tasks", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 1, dueDate: yesterday, title: "Overdue" })
    expect(result.score).toBeGreaterThanOrEqual(75)
    expect(result.reasoning).toContain("overdue")
  })

  it("boosts score for tasks due today", () => {
    const today = new Date().toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 2, dueDate: today, title: "Today" })
    expect(result.score).toBeGreaterThanOrEqual(65)
    expect(result.reasoning).toContain("due today")
  })

  it("returns scores below 60 for low-priority future tasks", () => {
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 1, dueDate: nextMonth, title: "Someday" })
    expect(result.score).toBeLessThan(60)
  })
})
