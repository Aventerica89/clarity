export const CLARITY_SYNC_COMPLETED_EVENT = "clarity:sync-completed"

interface SyncCompletedDetail {
  source: "header" | "settings" | "command-palette"
  providers: Array<"todoist" | "google-calendar" | "gmail" | "triage">
}

export function emitSyncCompleted(detail: SyncCompletedDetail): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<SyncCompletedDetail>(CLARITY_SYNC_COMPLETED_EVENT, { detail }))
}
