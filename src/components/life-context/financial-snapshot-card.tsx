"use client"

import { useState } from "react"
import { DollarSign, Loader2 } from "lucide-react"

interface Snapshot {
  id: string
  bankBalanceCents: number
  monthlyBurnCents: number
  notes: string | null
  updatedAt: Date
}

interface Props {
  snapshot: Snapshot | null
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2)
}

function parseDollars(value: string): number {
  const parsed = parseFloat(value.replace(/[^0-9.]/g, ""))
  if (isNaN(parsed) || parsed < 0) return 0
  return Math.round(parsed * 100)
}

export function FinancialSnapshotCard({ snapshot }: Props) {
  const [balance, setBalance] = useState(
    snapshot ? centsToDisplay(snapshot.bankBalanceCents) : "",
  )
  const [burn, setBurn] = useState(
    snapshot ? centsToDisplay(snapshot.monthlyBurnCents) : "",
  )
  const [notes, setNotes] = useState(snapshot?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(snapshot?.updatedAt ?? null)

  const balanceCents = parseDollars(balance)
  const burnCents = parseDollars(burn)
  const runway = burnCents > 0 ? (balanceCents / burnCents).toFixed(1) : null

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/life-context/financial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankBalanceCents: balanceCents,
          monthlyBurnCents: burnCents,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? "Failed to save snapshot.")
        return
      }
      const data = await res.json() as { snapshot: { updatedAt: string } }
      setUpdatedAt(new Date(data.snapshot.updatedAt))
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Financial Snapshot</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="bank-balance" className="text-xs text-muted-foreground">
            Bank Balance
          </label>
          <input
            id="bank-balance"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-clarity-amber/40"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="monthly-burn" className="text-xs text-muted-foreground">
            Monthly Burn
          </label>
          <input
            id="monthly-burn"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={burn}
            onChange={(e) => setBurn(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-clarity-amber/40"
          />
        </div>
      </div>

      {runway !== null && (
        <p className="text-xs text-muted-foreground">
          Runway: ~{runway} months
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="snapshot-notes" className="text-xs text-muted-foreground">
          Notes
        </label>
        <textarea
          id="snapshot-notes"
          placeholder="Any context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:border-clarity-amber/40"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex min-h-[44px] items-center gap-2 rounded-md bg-clarity-amber text-clarity-amber-foreground px-4 py-2.5 text-xs font-medium transition-colors hover:bg-clarity-amber/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3 animate-spin" />}
          {saving ? "Saving..." : "Save"}
        </button>
        {updatedAt && (
          <p className="text-xs text-muted-foreground/60">
            Updated {updatedAt.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}
