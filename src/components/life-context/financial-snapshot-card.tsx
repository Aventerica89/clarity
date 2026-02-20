"use client"

import { useState } from "react"
import { DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-primary" />
          Financial Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="bank-balance" className="text-sm">Bank Balance</Label>
            <Input
              id="bank-balance"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="monthly-burn" className="text-sm">Monthly Burn</Label>
            <Input
              id="monthly-burn"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={burn}
              onChange={(e) => setBurn(e.target.value)}
            />
          </div>
        </div>

        {runway !== null && (
          <p className="text-sm text-muted-foreground">
            Runway: ~{runway} months
          </p>
        )}

        <div className="space-y-1">
          <Label htmlFor="snapshot-notes" className="text-sm">Notes</Label>
          <Textarea
            id="snapshot-notes"
            placeholder="Any context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-between">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated: {updatedAt.toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
