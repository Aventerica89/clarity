/**
 * Parses structured day plan markdown into typed time blocks.
 * Falls back gracefully if parsing fails.
 */

export interface PlanItem {
  time: string
  title: string
  meta: string
  source: string
  isPriority: boolean
}

export interface TimeBlock {
  period: "morning" | "afternoon" | "evening"
  label: string
  range: string
  items: PlanItem[]
}

export interface HorizonDay {
  dayName: string
  date: string
  items: { text: string; type: "event" | "task" | "deadline" | "clear" }[]
}

export interface ParsedPlan {
  timeBlocks: TimeBlock[]
  horizon: HorizonDay[]
}

const PERIODS: { period: TimeBlock["period"]; label: string; range: string }[] = [
  { period: "morning", label: "Morning", range: "6 AM \u2013 12 PM" },
  { period: "afternoon", label: "Afternoon", range: "12 PM \u2013 6 PM" },
  { period: "evening", label: "Evening", range: "6 PM \u2013 10 PM" },
]

/** Split "Title — description" or "Title - description" into [title, meta] */
function splitTitleMeta(raw: string): { title: string; meta: string } {
  const dashIdx = raw.search(/\s[—–-]\s/)
  if (dashIdx === -1) return { title: raw.trim(), meta: "" }
  return {
    title: raw.slice(0, dashIdx).trim(),
    meta: raw.slice(dashIdx).replace(/^\s[—–-]\s/, "").trim(),
  }
}

const KNOWN_SOURCES = new Set([
  "priority", "calendar", "todoist", "routine", "gmail", "manual",
])

function parsePlanItem(line: string): PlanItem | null {
  const cleaned = line.replace(/^-\s*/, "").trim()
  if (cleaned.toLowerCase().includes("no items scheduled")) return null
  if (cleaned.length === 0) return null

  // Format A: **8:00 AM** | Title | Meta | SOURCE (3 pipes)
  const threeMatch = cleaned.match(
    /\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]*)\|\s*(\w+)/,
  )
  if (threeMatch) {
    const src = threeMatch[4].trim().toLowerCase()
    return {
      time: threeMatch[1].trim(),
      title: threeMatch[2].trim(),
      meta: threeMatch[3].trim(),
      source: KNOWN_SOURCES.has(src) ? src : "manual",
      isPriority: src === "priority",
    }
  }

  // Format B: **8:00 AM** | Title — desc | SOURCE (2 pipes)
  const twoMatch = cleaned.match(
    /\*\*([^*]+)\*\*\s*\|\s*(.+?)\s*\|\s*(\w+)\s*$/,
  )
  if (twoMatch) {
    const src = twoMatch[3].trim().toLowerCase()
    if (KNOWN_SOURCES.has(src)) {
      const { title, meta } = splitTitleMeta(twoMatch[2].trim())
      return {
        time: twoMatch[1].trim(),
        title,
        meta,
        source: src,
        isPriority: src === "priority",
      }
    }
  }

  // Fallback: **8:00 AM** - Title (rest is meta)
  const dashMatch = cleaned.match(
    /\*\*([^*]+)\*\*\s*[-\u2014\u2013]\s*(.+)/,
  )
  if (dashMatch) {
    const { title, meta } = splitTitleMeta(dashMatch[2].trim())
    return {
      time: dashMatch[1].trim(),
      title,
      meta,
      source: "manual",
      isPriority: false,
    }
  }

  // Last resort: treat entire line as title
  return {
    time: "",
    title: cleaned.replace(/\*\*/g, ""),
    meta: "",
    source: "manual",
    isPriority: false,
  }
}

function parseTimeBlocks(text: string): TimeBlock[] {
  return PERIODS.map(({ period, label, range }) => {
    const pattern = new RegExp(
      `### ${label}[^\\n]*\\n([\\s\\S]*?)(?=### |## |$)`,
      "i",
    )
    const match = text.match(pattern)
    if (!match) return { period, label, range, items: [] }

    const lines = match[1].split("\n").filter((l) => l.trim().startsWith("- "))
    const items = lines
      .map(parsePlanItem)
      .filter((item): item is PlanItem => item !== null)

    return { period, label, range, items }
  })
}

function parseHorizon(text: string): HorizonDay[] {
  const horizonIdx = text.indexOf("## Next 3 Days")
  if (horizonIdx === -1) return []

  const horizonText = text.slice(horizonIdx)
  const days: HorizonDay[] = []
  const dayPattern = /### ([A-Za-z]+),?\s*([A-Za-z]+ \d{1,2})\n([\s\S]*?)(?=### |$)/g
  let m: RegExpExecArray | null = null

  while ((m = dayPattern.exec(horizonText)) !== null) {
    const lines = m[3].split("\n").filter((l) => l.trim().startsWith("- "))
    const items = lines.map((line) => {
      const cleaned = line.replace(/^-\s*/, "").trim()
      let type: "event" | "task" | "deadline" | "clear" = "task"
      if (/\[EVENT\]/i.test(cleaned)) type = "event"
      else if (/\[DEADLINE\]/i.test(cleaned)) type = "deadline"
      else if (/\[CLEAR\]/i.test(cleaned) || /clear day/i.test(cleaned)) type = "clear"

      const itemText = cleaned
        .replace(/\[(EVENT|TASK|DEADLINE|CLEAR)\]/gi, "")
        .trim()
      return { text: itemText, type }
    })

    days.push({ dayName: m[1].trim(), date: m[2].trim(), items })
  }

  return days
}

export function parseDayPlan(todayPlan: string, horizon: string): ParsedPlan {
  const timeBlocks = parseTimeBlocks(todayPlan)
  const horizonDays = parseHorizon(horizon || todayPlan)

  const totalItems = timeBlocks.reduce((sum, b) => sum + b.items.length, 0)

  // Fallback: if zero items parsed, show raw text
  if (totalItems === 0 && todayPlan.trim().length > 0) {
    return {
      timeBlocks: [
        {
          ...PERIODS[0],
          items: [{
            time: "",
            title: todayPlan.slice(0, 200),
            meta: "Could not parse structured plan",
            source: "manual",
            isPriority: false,
          }],
        },
        { ...PERIODS[1], items: [] },
        { ...PERIODS[2], items: [] },
      ],
      horizon: horizonDays,
    }
  }

  return { timeBlocks, horizon: horizonDays }
}
