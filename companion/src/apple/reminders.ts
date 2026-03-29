import { runAppleScript, runJXA } from "./utils.js"

const LIST_NAME = "Clarity"

interface ReminderOptions {
  name: string
  dueDate: string       // "2026-03-28 06:00:00"
  hasAlarm: boolean      // true = set remind me date (push notification)
  notes?: string         // metadata like "clarity:itemId:xxx"
}

// Ensure the Clarity list exists in Apple Reminders
export async function ensureClarityList(): Promise<void> {
  const script = `
    tell application "Reminders"
      if not (exists list "${LIST_NAME}") then
        make new list with properties {name:"${LIST_NAME}"}
      end if
    end tell
  `
  await runAppleScript(script)
}

// Create a single reminder in the Clarity list
export async function createReminder(opts: ReminderOptions): Promise<string> {
  const notesLine = opts.notes
    ? `set body of newReminder to "${escapeAS(opts.notes)}"`
    : ""

  const alarmLine = opts.hasAlarm
    ? `set remind me date of newReminder to date "${opts.dueDate}"`
    : ""

  const script = `
    tell application "Reminders"
      set clarityList to list "${LIST_NAME}"
      set newReminder to make new reminder at end of reminders of clarityList with properties {name:"${escapeAS(opts.name)}", due date:date "${opts.dueDate}"}
      ${alarmLine}
      ${notesLine}
      return id of newReminder
    end tell
  `
  return runAppleScript(script)
}

// Delete all reminders in the Clarity list
export async function deleteAllClarityReminders(): Promise<number> {
  // Use JXA (JavaScript for Automation) instead of AppleScript
  // to avoid the "Can't get item" iteration bug
  const script = `
    const app = Application("Reminders");
    const lists = app.lists.whose({name: "${LIST_NAME}"})();
    if (lists.length === 0) return "0";
    const list = lists[0];
    const reminders = list.reminders();
    const count = reminders.length;
    for (let i = count - 1; i >= 0; i--) {
      reminders[i].delete();
    }
    return String(count);
  `
  try {
    const result = await runJXA(script)
    return parseInt(result, 10) || 0
  } catch {
    return 0
  }
}

// Get IDs of completed reminders in the Clarity list
export async function getCompletedReminderNotes(): Promise<string[]> {
  const script = `
    tell application "Reminders"
      set clarityList to list "${LIST_NAME}"
      set completedNotes to {}
      repeat with r in (every reminder of clarityList whose completed is true)
        set n to body of r
        if n is not missing value and n starts with "clarity:" then
          set end of completedNotes to n
        end if
      end repeat
      return completedNotes
    end tell
  `
  const result = await runAppleScript(script)
  if (!result) return []
  return result.split(", ").filter(Boolean)
}

// Delete all completed reminders in the Clarity list (cleanup)
export async function purgeCompletedReminders(): Promise<number> {
  const script = `
    tell application "Reminders"
      set clarityList to list "${LIST_NAME}"
      set completedList to (every reminder of clarityList whose completed is true)
      set count to (count of completedList)
      repeat with r in completedList
        delete r
      end repeat
      return count
    end tell
  `
  const result = await runAppleScript(script)
  return parseInt(result, 10) || 0
}

// Escape special characters for AppleScript strings
function escapeAS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}
