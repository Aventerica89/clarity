"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { RefreshCw, Loader2, CheckCircle2, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TriageCard, type TriageItem } from "@/components/triage/triage-card"
import { TriageTable } from "@/components/triage/triage-table"
import { ApproveModal } from "@/components/triage/approve-modal"
import { SubtaskModal } from "@/components/triage/subtask-modal"
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle"
import { FilterBar, type FilterDef } from "@/components/ui/filter-bar"

const SOURCE_FILTERS: FilterDef[] = [
  {
    key: "source",
    label: "All Sources",
    options: [
      { label: "All Sources", value: "all" },
      { label: "Gmail", value: "gmail" },
      { label: "Todoist", value: "todoist" },
      { label: "Google Calendar", value: "google_calendar" },
      { label: "Google Tasks", value: "google_tasks" },
    ],
  },
]

const GRID_CLASS: Record<ViewMode, string> = {
  grid3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3",
  grid2: "grid grid-cols-1 lg:grid-cols-2 gap-4",
  table: "",
}

export function TriagePageContent() {
  const searchParams = useSearchParams()
  const source = searchParams.get("source") ?? "all"

  const [items, setItems] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [approveTarget, setApproveTarget] = useState<TriageItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<TriageItem | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("triage-view")
    if (saved === "grid2" || saved === "grid3" || saved === "table") setViewMode(saved)
  }, [])

  function handleViewChange(v: ViewMode) {
    setViewMode(v)
    localStorage.setItem("triage-view", v)
  }

  const loadItems = useCallback(async () => {
    setLoading(true)
    const url = source !== "all"
      ? `/api/triage?status=pending&source=${source}`
      : "/api/triage?status=pending"
    const res = await fetch(url)
    const data = (await res.json()) as { items: TriageItem[] }
    setItems(data.items ?? [])
    setLoading(false)
  }, [source])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleScan() {
    setScanning(true)
    try {
      const res = await fetch("/api/triage/scan", { method: "POST" })
      const data = (await res.json()) as { added: number; skipped: number; errors: string[] }

      if (data.errors?.length > 0) {
        toast.warning(`Scan complete with ${data.errors.length} error(s)`, {
          description: data.errors[0],
        })
      } else if (data.added > 0) {
        toast.success(`Found ${data.added} new item${data.added !== 1 ? "s" : ""}`)
      } else {
        toast.info("All up to date")
      }

      await loadItems()
    } catch {
      toast.error("Scan failed — check your connection")
    } finally {
      setScanning(false)
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function runAction(id: string, action: "dismiss" | "push_to_context" | "complete") {
    const res = await fetch(`/api/triage/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    if (!res.ok) throw new Error(`Failed ${action}: ${res.status}`)
    removeItem(id)
  }

  function handleDismiss(id: string) {
    removeItem(id)
  }

  async function handleDismissAction(id: string) {
    try {
      await runAction(id, "dismiss")
    } catch {
      toast.error("Failed to dismiss item")
    }
  }

  function handlePushToContext(id: string) {
    removeItem(id)
  }

  async function handlePushToContextAction(id: string) {
    try {
      await runAction(id, "push_to_context")
    } catch {
      toast.error("Failed to push item to context")
    }
  }

  function handleComplete(id: string) {
    removeItem(id)
  }

  async function handleCompleteAction(id: string) {
    try {
      await runAction(id, "complete")
    } catch {
      toast.error("Failed to complete item")
    }
  }

  function handleApproveSuccess(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setApproveTarget(null)
  }

  function handleDetailComplete(id: string) {
    removeItem(id)
    setDetailTarget(null)
  }

  function handleDetailPin(id: string) {
    removeItem(id)
    setDetailTarget(null)
  }

  const cardVariant = viewMode === "grid3" ? "compact" : "comfortable"

  const displayItems = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.snippet.toLowerCase().includes(q),
    )
  }, [items, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Triage</h1>
          <p className="text-muted-foreground text-sm">
            {displayItems.length} item{displayItems.length !== 1 ? "s" : ""} need your attention
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning
            ? <Loader2 className="size-4 mr-2 animate-spin" />
            : <RefreshCw className="size-4 mr-2" />
          }
          Scan now
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search triage items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-10 md:h-8 text-base md:text-xs"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FilterBar filters={SOURCE_FILTERS} />
          <ViewToggle pageKey="triage" value={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="size-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium">{search ? "No matches" : "All clear"}</p>
          <p className="text-sm text-muted-foreground">
            {search
              ? "No triage items match your search."
              : "No items need your attention right now."}
          </p>
          {!search && (
            <Button variant="outline" size="sm" className="mt-4" onClick={handleScan}>
              Scan for new items
            </Button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <TriageTable
          items={displayItems}
          onApprove={setApproveTarget}
          onDismiss={handleDismissAction}
          onPushToContext={handlePushToContextAction}
          onComplete={handleCompleteAction}
        />
      ) : (
        <div className={GRID_CLASS[viewMode]}>
          {displayItems.map((item) => (
            <TriageCard
              key={item.id}
              item={item}
              variant={cardVariant}
              onApprove={setApproveTarget}
              onDismiss={handleDismiss}
              onPushToContext={handlePushToContext}
              onComplete={handleComplete}
              onCardClick={setDetailTarget}
            />
          ))}
        </div>
      )}

      <ApproveModal
        item={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={handleApproveSuccess}
      />

      <SubtaskModal
        item={detailTarget}
        onClose={() => setDetailTarget(null)}
        onComplete={handleDetailComplete}
        onApprove={(item) => { removeItem(item.id); setDetailTarget(null) }}
        onPin={handleDetailPin}
      />
    </div>
  )
}
