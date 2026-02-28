"use client"

import { LayoutGrid, LayoutList, Rows3 } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type ViewMode = "compact" | "comfortable" | "spacious"

interface ViewToggleProps {
  pageKey: string
  value: ViewMode
  onChange: (v: ViewMode) => void
}

export function ViewToggle({ pageKey, value, onChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as ViewMode) }}
      className="h-8"
    >
      <ToggleGroupItem value="compact" aria-label="Compact view" className="h-8 w-8 p-0">
        <LayoutGrid className="h-3.5 w-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem value="comfortable" aria-label="Comfortable view" className="h-8 w-8 p-0">
        <LayoutList className="h-3.5 w-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem value="spacious" aria-label="Spacious view" className="h-8 w-8 p-0">
        <Rows3 className="h-3.5 w-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
