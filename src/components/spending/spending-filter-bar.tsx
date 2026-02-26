"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  type TransactionFilters,
  CATEGORY_LABELS,
  CATEGORY_LIST,
} from "@/types/transaction"

interface SpendingFilterBarProps {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
}

export function SpendingFilterBar({ filters, onChange }: SpendingFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Search transactions..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-[180px] h-8 text-xs"
      />

      <Select
        value={filters.dateRange}
        onValueChange={(v) => onChange({ ...filters, dateRange: v })}
      >
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="60d">Last 60 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.category}
        onValueChange={(v) => onChange({ ...filters, category: v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORY_LIST.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

    </div>
  )
}
