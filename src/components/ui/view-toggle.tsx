"use client"

import { Grid2x2, Grid3x3, Table2 } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type ViewMode = "grid2" | "grid3" | "table"

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
      data-page={pageKey}
    >
      <ToggleGroupItem value="grid2" aria-label="2-column grid view" className="h-8 w-8 p-0">
        <Grid2x2 className="h-3.5 w-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid3" aria-label="3-column grid view" className="h-8 w-8 p-0">
        <Grid3x3 className="h-3.5 w-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0">
        <Table2 className="h-3.5 w-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
