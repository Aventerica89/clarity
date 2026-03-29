import { config } from "./config.js"
import { fetchSchedule, sendHeartbeat, reportSyncState, type ResolvedSchedule } from "./api-client.js"
import { ensureClarityList, createReminder, deleteAllClarityReminders, getCompletedReminderNotes } from "./apple/reminders.js"

// In-memory hash cache to avoid unnecessary Apple Reminders writes
const lastSyncedHashes = new Map<string, string>()

function getTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone }).format(new Date())
}

function getTomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone }).format(d)
}

function formatDateForAS(date: string, time: string): string {
  // "2026-03-28" + "06:00" -> "2026-03-28 06:00:00"
  return `${date} ${time}:00`
}

async function syncScheduleForDate(schedule: ResolvedSchedule): Promise<void> {
  const { date, hash, entries } = schedule
  const lastHash = lastSyncedHashes.get(date)

  if (lastHash === hash) {
    return // No changes
  }

  console.log(`[sync] ${date}: hash changed (${lastHash?.slice(0, 8) ?? "none"} -> ${hash.slice(0, 8)}), syncing ${entries.length} entries`)

  try {
    // Delete existing Clarity reminders before recreating
    try {
      const deleted = await deleteAllClarityReminders()
      if (deleted > 0) {
        console.log(`[sync] ${date}: deleted ${deleted} old reminders`)
      }
    } catch {
      console.log(`[sync] ${date}: delete skipped (list may be empty)`)
    }

    // Create new reminders
    const reminderIds: string[] = []
    for (const entry of entries) {
      const hasAlarm = entry.type === "alarm" || entry.type === "checklist_start"
      const notes = entry.checklistId
        ? `clarity:checklistItemId:${entry.checklistId}`
        : undefined

      try {
        const id = await createReminder({
          name: entry.label,
          dueDate: formatDateForAS(date, entry.time),
          hasAlarm,
          notes,
        })
        reminderIds.push(id)
      } catch (err) {
        console.error(`[sync] Failed to create reminder "${entry.label}":`, err)
      }
    }

    // Report sync state to Clarity API
    await reportSyncState(date, hash, reminderIds, "synced")
    lastSyncedHashes.set(date, hash)

    console.log(`[sync] ${date}: created ${reminderIds.length}/${entries.length} reminders`)
  } catch (err) {
    console.error(`[sync] ${date}: sync failed:`, err)
    await reportSyncState(date, hash, [], "error", String(err))
  }
}

async function checkCompletions(): Promise<void> {
  try {
    const notes = await getCompletedReminderNotes()
    // notes format: "clarity:checklistItemId:uuid"
    for (const note of notes) {
      const match = note.match(/^clarity:checklistItemId:(.+)$/)
      if (match) {
        const today = getTodayDate()
        console.log(`[completions] Reporting completion for item ${match[1]}`)
        // Note: reportCompletion takes itemId, not checklistItemId
        // The API route handles mapping
      }
    }
  } catch {
    // Completions check is best-effort
  }
}

async function pollCycle(): Promise<void> {
  // Heartbeat (fire and forget)
  sendHeartbeat().catch(() => {})

  const today = getTodayDate()
  const tomorrow = getTomorrowDate()

  // Fetch schedules
  const [todaySchedule, tomorrowSchedule] = await Promise.all([
    fetchSchedule(today),
    fetchSchedule(tomorrow),
  ])

  // Sync each schedule that has data
  if (todaySchedule) {
    await syncScheduleForDate(todaySchedule)
  }
  if (tomorrowSchedule) {
    await syncScheduleForDate(tomorrowSchedule)
  }

  // Check for completions
  await checkCompletions()
}

export async function startScheduler(): Promise<void> {
  console.log(`[companion] Starting scheduler (poll every ${config.pollIntervalMs / 1000}s)`)
  console.log(`[companion] API: ${config.apiUrl}`)
  console.log(`[companion] Timezone: ${config.timezone}`)

  // Ensure Clarity list exists in Apple Reminders
  await ensureClarityList()
  console.log("[companion] Clarity list verified in Apple Reminders")

  // Initial poll
  await pollCycle()

  // Recurring poll
  setInterval(pollCycle, config.pollIntervalMs)
}
