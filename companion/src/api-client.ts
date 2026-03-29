import { config } from "./config.js"

interface ScheduleEntry {
  time: string
  label: string
  type: "alarm" | "reminder" | "checklist_start"
  source: "derived" | "anchor" | "custom" | "checklist"
  checklistId?: string
}

export interface ResolvedSchedule {
  date: string
  templateName: string
  entries: ScheduleEntry[]
  hash: string
}

interface ScheduleResponse {
  schedule: ResolvedSchedule | null
  message?: string
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${config.apiUrl}${path}`
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      ...init?.headers,
    },
  })
}

export async function fetchSchedule(date: string): Promise<ResolvedSchedule | null> {
  const res = await apiFetch(`/api/companion/schedule?date=${date}`)
  if (!res.ok) {
    console.error(`[api] schedule ${date}: ${res.status} ${res.statusText}`)
    return null
  }
  const data: ScheduleResponse = await res.json()
  return data.schedule
}

export async function sendHeartbeat(): Promise<boolean> {
  try {
    const res = await apiFetch("/api/companion/heartbeat", { method: "POST" })
    return res.ok
  } catch {
    return false
  }
}

export async function reportSyncState(
  syncDate: string,
  scheduleHash: string,
  appleReminderIds: string[],
  status: "synced" | "error",
  lastError?: string,
): Promise<boolean> {
  try {
    const res = await apiFetch("/api/companion/sync-state", {
      method: "POST",
      body: JSON.stringify({ syncDate, scheduleHash, appleReminderIds, status, lastError }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function reportCompletion(itemId: string, completedDate: string): Promise<boolean> {
  try {
    const res = await apiFetch("/api/companion/completions", {
      method: "POST",
      body: JSON.stringify({ itemId, completedDate }),
    })
    return res.ok
  } catch {
    return false
  }
}
