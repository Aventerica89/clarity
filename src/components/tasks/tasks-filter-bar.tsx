"use client"

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
}

export function TasksFilterBar({ filters, onChange }: TasksFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={filters.source}
        onValueChange={(v) => onChange({ ...filters, source: v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
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
        <SelectTrigger className="w-[130px] h-8 text-xs">
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
        onValueChange={(v) => onChange({ ...filters, dateFilter: v as TaskFilters["dateFilter"] })}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Due date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
