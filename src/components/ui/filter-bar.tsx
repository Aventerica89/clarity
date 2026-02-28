"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface FilterDef {
  key: string
  label: string
  options: { label: string; value: string }[]
}

interface FilterBarProps {
  filters: FilterDef[]
  className?: string
}

export function FilterBar({ filters, className }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {filters.map((f) => (
        <Select
          key={f.key}
          value={searchParams.get(f.key) ?? "all"}
          onValueChange={(v) => handleChange(f.key, v)}
        >
          <SelectTrigger className="h-8 text-xs w-auto min-w-[120px] gap-1">
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
