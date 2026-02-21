"use client"

import { useState } from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Category = "housing" | "insurance" | "medical" | "transport" | "subscription" | "utilities" | "other"
type Frequency = "monthly" | "weekly" | "biweekly" | "annual"

type RoutineCost = {
  id: string
  label: string
  category: Category
  amountCents: number
  frequency: Frequency
  notes: string | null
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "housing", label: "Housing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "insurance", label: "Insurance", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "medical", label: "Medical", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "transport", label: "Transport", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "subscription", label: "Subscription", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { value: "utilities", label: "Utilities", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "other", label: "Other", color: "bg-muted text-muted-foreground" },
]

const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "/ mo",
  weekly: "/ wk",
  biweekly: "/ 2wk",
  annual: "/ yr",
}

// Convert any frequency to monthly equivalent
function toMonthlyCents(amountCents: number, frequency: Frequency): number {
  switch (frequency) {
    case "monthly": return amountCents
    case "weekly": return Math.round(amountCents * 52 / 12)
    case "biweekly": return Math.round(amountCents * 26 / 12)
    case "annual": return Math.round(amountCents / 12)
  }
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function categoryColor(cat: Category): string {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? CATEGORIES[6].color
}

// Flag costs that seem high by category (rough thresholds in cents/mo)
const HIGH_THRESHOLDS: Partial<Record<Category, number>> = {
  insurance: 60000,   // $600/mo health insurance → flag
  housing: 200000,    // $2000/mo rent → flag
  transport: 30000,   // $300/mo car costs → flag
}

function isHigh(cost: RoutineCost): boolean {
  const threshold = HIGH_THRESHOLDS[cost.category]
  if (!threshold) return false
  return toMonthlyCents(cost.amountCents, cost.frequency) > threshold
}

const BLANK_FORM = { label: "", category: "other" as Category, amount: "", frequency: "monthly" as Frequency, notes: "" }

export function RoutineCostsSection({ initial }: { initial: RoutineCost[] }) {
  const [costs, setCosts] = useState<RoutineCost[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [adding, setAdding] = useState(false)

  const totalMonthlyCents = costs.reduce((sum, c) => sum + toMonthlyCents(c.amountCents, c.frequency), 0)

  async function addCost() {
    const amountCents = Math.round(parseFloat(form.amount) * 100)
    if (!form.label.trim() || !Number.isFinite(amountCents) || amountCents <= 0) return

    setAdding(true)
    const res = await fetch("/api/routine-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: form.label, category: form.category, amountCents, frequency: form.frequency, notes: form.notes }),
    })
    const data = await res.json() as { cost: RoutineCost }
    setCosts((prev) => [...prev, data.cost])
    setForm(BLANK_FORM)
    setShowAdd(false)
    setAdding(false)
  }

  async function deleteCost(id: string) {
    await fetch(`/api/routine-costs/${id}`, { method: "DELETE" })
    setCosts((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Routine Costs</CardTitle>
            <CardDescription>
              Recurring expenses the AI coach is aware of. High costs get flagged for review suggestions.
            </CardDescription>
          </div>
          {costs.length > 0 && (
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold">{formatDollars(totalMonthlyCents)}</div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {costs.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground">No routine costs added yet.</p>
        )}

        {costs.map((cost) => {
          const monthly = toMonthlyCents(cost.amountCents, cost.frequency)
          const high = isHigh(cost)
          return (
            <div
              key={cost.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm"
            >
              <Badge className={["text-xs font-medium border-0", categoryColor(cost.category)].join(" ")}>
                {CATEGORIES.find((c) => c.value === cost.category)?.label ?? cost.category}
              </Badge>
              <span className="flex-1 font-medium">{cost.label}</span>
              {cost.notes && (
                <span className="text-muted-foreground text-xs hidden sm:inline">{cost.notes}</span>
              )}
              <span className="font-mono text-sm shrink-0">
                {formatDollars(cost.amountCents)}{FREQUENCY_LABELS[cost.frequency]}
              </span>
              {cost.frequency !== "monthly" && (
                <span className="text-xs text-muted-foreground shrink-0">
                  ({formatDollars(monthly)}/mo)
                </span>
              )}
              {high && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">high</span>
              )}
              <button
                type="button"
                onClick={() => deleteCost(cost.id)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        {showAdd ? (
          <div className="rounded-md border border-dashed p-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Label (e.g. Health Insurance)"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                autoFocus
              />
              <Input
                placeholder="Amount (e.g. 450)"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, category: cat.value }))}
                  className={[
                    "h-6 rounded-full px-2.5 text-xs font-medium transition-colors border-0",
                    form.category === cat.value ? cat.color : "bg-muted text-muted-foreground hover:bg-muted/70",
                  ].join(" ")}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["monthly", "weekly", "biweekly", "annual"] as Frequency[]).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, frequency: freq }))}
                  className={[
                    "h-6 rounded-full px-2.5 text-xs font-medium transition-colors",
                    form.frequency === freq
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  ].join(" ")}
                >
                  {freq}
                </button>
              ))}
            </div>
            <Input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addCost} disabled={adding}>
                {adding ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setForm(BLANK_FORM) }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add cost
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
