import { describe, it, expect } from "vitest"
import {
  scoreTodoistTask,
  scoreCalendarEvent,
} from "@/lib/triage/score-structured"

describe("scoreTodoistTask", () => {
  it("scores overdue P1 task at 95", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 4, dueDate: yesterday, title: "Test" })
    expect(result.score).toBe(95)
    expect(result.reasoning).toContain("overdue")
  })

  it("scores P1 task due today at 85", () => {
    const today = new Date().toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 4, dueDate: today, title: "Test" })
    expect(result.score).toBe(85)
  })

  it("scores P4 task with no due date at 20", () => {
    const result = scoreTodoistTask({ priority: 1, dueDate: null, title: "Test" })
    expect(result.score).toBe(20)
  })
})

describe("scoreCalendarEvent", () => {
  it("scores event in next 4 hours at 80", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const result = scoreCalendarEvent({ startAt: soon, title: "Team standup" })
    expect(result.score).toBeGreaterThanOrEqual(75)
  })

  it("scores event 5 days away at 30", () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString()
    const result = scoreCalendarEvent({ startAt: future, title: "Dentist" })
    expect(result.score).toBeLessThan(50)
  })
})
