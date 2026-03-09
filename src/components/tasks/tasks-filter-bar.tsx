"use client"

import { Search, Grid2x2, Grid3x3, Table2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TASK_SOURCES, SOURCE_LABELS, type TaskFilters } from "@/types/task"

interface TasksFilterBarProps {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
  search: string
  onSearchChange: (v: string) => void
  view: "grid2" | "grid3" | "table"
  onViewChange: (v: "grid2" | "grid3" | "table") => void
  projects: string[]
}

export function TasksFilterBar({
  filters,
  onChange,
  search,
  onSearchChange,
  view,
  onViewChange,
  projects,
}: TasksFilterBarProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-10 md:h-8 text-base md:text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={filters.source}
          onValueChange={(v) => onChange({ ...filters, source: v })}
        >
          <SelectTrigger className="w-[140px] h-10 md:h-8 text-sm md:text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {TASK_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(v) => onChange({ ...filters, priority: v })}
        >
          <SelectTrigger className="w-[130px] h-10 md:h-8 text-sm md:text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="5">Urgent</SelectItem>
            <SelectItem value="4">High</SelectItem>
            <SelectItem value="3">Medium</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.dateFilter ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filters, dateFilter: v as TaskFilters["dateFilter"] })
          }
        >
          <SelectTrigger className="w-[130px] h-10 md:h-8 text-sm md:text-xs">
            <SelectValue placeholder="Due date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        {projects.length > 0 && (
          <Select
            value={filters.project}
            onValueChange={(v) => onChange({ ...filters, project: v })}
          >
            <SelectTrigger className="w-[150px] h-10 md:h-8 text-sm md:text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex gap-1">
          <Button
            variant={view === "grid2" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10 md:h-8 md:w-8"
            onClick={() => onViewChange("grid2")}
            aria-label="2-column grid view"
          >
            <Grid2x2 className="size-3.5" />
          </Button>
          <Button
            variant={view === "grid3" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10 md:h-8 md:w-8"
            onClick={() => onViewChange("grid3")}
            aria-label="3-column grid view"
          >
            <Grid3x3 className="size-3.5" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10 md:h-8 md:w-8"
            onClick={() => onViewChange("table")}
            aria-label="Table view"
          >
            <Table2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
