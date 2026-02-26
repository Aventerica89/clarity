"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { TriageCard, type TriageItem } from "@/components/triage/triage-card"
import { ApproveModal } from "@/components/triage/approve-modal"

export default function TriagePage() {
  const [items, setItems] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [approveTarget, setApproveTarget] = useState<TriageItem | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/triage?status=pending")
    const data = (await res.json()) as { items: TriageItem[] }
    setItems(data.items ?? [])
    setLoading(false)
  }, [])

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

  function handleDismiss(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handlePushToContext(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handleComplete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handleApproveSuccess(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setApproveTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Triage</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} item{items.length !== 1 ? "s" : ""} need your attention
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="size-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium">All clear</p>
          <p className="text-sm text-muted-foreground">
            No items need your attention right now.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleScan}>
            Scan for new items
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TriageCard
              key={item.id}
              item={item}
              onApprove={setApproveTarget}
              onDismiss={handleDismiss}
              onPushToContext={handlePushToContext}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      <ApproveModal
        item={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={handleApproveSuccess}
      />
    </div>
  )
}
