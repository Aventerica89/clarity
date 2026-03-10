export interface TriageItem {
  id: string
  source: string
  sourceId: string
  title: string
  snippet: string
  aiScore: number
  aiReasoning: string
  createdAt: string
  sourceMetadata: string
}

export const TODOIST_PRIORITIES = [
  { value: 1, label: "P1" },
  { value: 2, label: "P2" },
  { value: 3, label: "P3" },
  { value: 4, label: "P4" },
] as const

const URL_PATTERN = /^https?:\/\/\S+$/i
const MD_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g

export function cleanTitle(title: string): string {
  return title.replace(MD_LINK_PATTERN, "$1")
}

export function formatSenderName(from: string): string {
  const nameMatch = from.match(/^([^<]+?)(?:\s*<|$)/)
  return nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : from
}

export function getGmailDisplayTitle(item: TriageItem): { title: string; subtitle: string | null } {
  if (!URL_PATTERN.test(item.title.trim())) {
    return { title: item.title, subtitle: null }
  }
  const meta = JSON.parse(item.sourceMetadata || "{}") as { from?: string }
  const sender = meta.from ? formatSenderName(meta.from) : null
  return {
    title: sender ? `Email from ${sender}` : "(link shared)",
    subtitle: item.title,
  }
}

export interface ParsedSourceMetadata {
  from?: string
  priority?: number
  due?: string
}

export function parseSourceMetadata(raw: string): ParsedSourceMetadata {
  return JSON.parse(raw || "{}") as ParsedSourceMetadata
}
