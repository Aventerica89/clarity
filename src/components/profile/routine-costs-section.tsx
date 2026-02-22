"use client"

import { useState, useCallback } from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Category =
  | "housing"
  | "insurance"
  | "medical"
  | "transport"
  | "subscription"
  | "utilities"
  | "other"

type Frequency = "monthly" | "weekly" | "biweekly" | "annual"

type RoutineCost = {
  id: string
  label: string
  category: Category
  amountCents: number
  frequency: Frequency
  notes: string | null
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "housing", label: "Housing" },
  { value: "insurance", label: "Insurance" },
  { value: "medical", label: "Medical" },
  { value: "transport", label: "Transport" },
  { value: "subscription", label: "Subscription" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
]

const CATEGORY_COLORS: Record<Category, string> = {
  housing: "bg-cat-housing/12 text-cat-housing",
  insurance: "bg-cat-insurance/12 text-cat-insurance",
  medical: "bg-cat-medical/12 text-cat-medical",
  transport: "bg-cat-transport/12 text-cat-transport",
  subscription: "bg-cat-subscription/12 text-cat-subscription",
  utilities: "bg-cat-utilities/12 text-cat-utilities",
  other: "bg-muted text-muted-foreground",
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "/ mo",
  weekly: "/ wk",
  biweekly: "/ 2wk",
  annual: "/ yr",
}

function toMonthlyCents(amountCents: number, frequency: Frequency): number {
  switch (frequency) {
    case "monthly":
      return amountCents
    case "weekly":
      return Math.round((amountCents * 52) / 12)
    case "biweekly":
      return Math.round((amountCents * 26) / 12)
    case "annual":
      return Math.round(amountCents / 12)
  }
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

const HIGH_THRESHOLDS: Partial<Record<Category, number>> = {
  insurance: 60000,
  housing: 200000,
  transport: 30000,
}

function isHigh(cost: RoutineCost): boolean {
  const threshold = HIGH_THRESHOLDS[cost.category]
  if (!threshold) return false
  return toMonthlyCents(cost.amountCents, cost.frequency) > threshold
}

const BLANK_FORM = {
  label: "",
  category: "other" as Category,
  amount: "",
  frequency: "monthly" as Frequency,
  notes: "",
}

function CategoryBadge({
  category,
  className,
}: {
  category: Category
  className?: string
}) {
  const label =
    CATEGORIES.find((c) => c.value === category)?.label ?? category
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        CATEGORY_COLORS[category],
        className
      )}
    >
      {label}
    </span>
  )
}

function CostRow({
  cost,
  onDelete,
}: {
  cost: RoutineCost
  onDelete: (id: string) => void
}) {
  const monthly = toMonthlyCents(cost.amountCents, cost.frequency)
  const high = isHigh(cost)

  return (
    <div className="flex min-h-[44px] items-center gap-3 px-4 py-3 text-sm">
      <CategoryBadge category={cost.category} />
      <span className="flex-1 font-medium">{cost.label}</span>
      {cost.notes && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {cost.notes}
        </span>
      )}
      <span className="shrink-0 font-mono text-xs tabular-nums">
        {formatDollars(cost.amountCents)}
        {FREQUENCY_LABELS[cost.frequency]}
      </span>
      {cost.frequency !== "monthly" && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          ({formatDollars(monthly)}/mo)
        </span>
      )}
      {high && (
        <span className="shrink-0 text-xs font-medium text-warning">high</span>
      )}
      <button
        type="button"
        onClick={() => onDelete(cost.id)}
        className="relative ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors before:absolute before:inset-[-4px] before:content-[''] hover:text-destructive"
        aria-label={`Delete ${cost.label}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function CategoryChip({
  category,
  selected,
  onClick,
}: {
  category: { value: Category; label: string }
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[44px] rounded-full px-3 py-2 text-xs font-medium transition-colors",
        selected
          ? "bg-clarity-amber/10 text-clarity-amber ring-1 ring-inset ring-clarity-amber/20"
          : "border text-muted-foreground hover:text-foreground"
      )}
    >
      {category.label}
    </button>
  )
}

function FrequencyChip({
  frequency,
  selected,
  onClick,
}: {
  frequency: Frequency
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[44px] rounded-full px-3 py-2 text-xs font-medium transition-colors",
        selected
          ? "bg-clarity-amber/10 text-clarity-amber ring-1 ring-inset ring-clarity-amber/20"
          : "border text-muted-foreground hover:text-foreground"
      )}
    >
      {frequency}
    </button>
  )
}

function AddCostForm({
  onAdd,
  onCancel,
}: {
  onAdd: (form: typeof BLANK_FORM) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(BLANK_FORM)
  const [adding, setAdding] = useState(false)

  const handleAdd = useCallback(async () => {
    setAdding(true)
    await onAdd(form)
    setForm(BLANK_FORM)
    setAdding(false)
  }, [form, onAdd])

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
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
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.value}
            category={cat}
            selected={form.category === cat.value}
            onClick={() => setForm((p) => ({ ...p, category: cat.value }))}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["monthly", "weekly", "biweekly", "annual"] as Frequency[]).map(
          (freq) => (
            <FrequencyChip
              key={freq}
              frequency={freq}
              selected={form.frequency === freq}
              onClick={() => setForm((p) => ({ ...p, frequency: freq }))}
            />
          )
        )}
      </div>
      <Input
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={adding}
          className="min-h-[44px] bg-clarity-amber text-clarity-amber-foreground hover:bg-clarity-amber/90"
        >
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="min-h-[44px]">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function RoutineCostsSection({
  initial,
}: {
  initial: RoutineCost[]
}) {
  const [costs, setCosts] = useState<RoutineCost[]>(initial)
  const [showAdd, setShowAdd] = useState(false)

  const totalMonthlyCents = costs.reduce(
    (sum, c) => sum + toMonthlyCents(c.amountCents, c.frequency),
    0
  )

  const handleAdd = useCallback(
    async (form: typeof BLANK_FORM) => {
      const amountCents = Math.round(parseFloat(form.amount) * 100)
      if (
        !form.label.trim() ||
        !Number.isFinite(amountCents) ||
        amountCents <= 0
      )
        return

      const res = await fetch("/api/routine-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label,
          category: form.category,
          amountCents,
          frequency: form.frequency,
          notes: form.notes,
        }),
      })
      const data = (await res.json()) as { cost: RoutineCost }
      setCosts((prev) => [...prev, data.cost])
      setShowAdd(false)
    },
    []
  )

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/routine-costs/${id}`, { method: "DELETE" })
    setCosts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground text-balance">
            Routine Costs
          </h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Recurring expenses the AI coach is aware of. High costs get
            flagged for review suggestions.
          </p>
        </div>
        {costs.length > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold font-mono tabular-nums">
              {formatDollars(totalMonthlyCents)}
            </div>
            <div className="text-xs text-muted-foreground">per month</div>
          </div>
        )}
      </div>

      {costs.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">
          No routine costs added yet.
        </p>
      )}

      {costs.length > 0 && (
        <div className="rounded-lg border divide-y">
          {costs.map((cost) => (
            <CostRow key={cost.id} cost={cost} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showAdd ? (
        <AddCostForm
          onAdd={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Add cost
        </Button>
      )}
    </Card>
  )
}
