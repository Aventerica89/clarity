"use client"

import { useState, useTransition, useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table"
import { Check, ChevronDown, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SortableHeader } from "@/components/ui/sortable-header"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SourceBadge } from "./source-badge"
import { ReschedulePopover } from "./reschedule-popover"
import {
  type TaskItem,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  parseLabels,
  parseMetadata,
  isOverdue,
} from "@/types/task"
import { cn } from "@/lib/utils"

interface TaskTableProps {
  tasks: TaskItem[]
  onComplete?: (id: string) => void
  onHide?: (id: string) => void
  onReschedule?: (id: string, date: string) => void
  onPriorityChange?: (id: string, priority: number) => Promise<void>
  onBulkComplete?: (ids: string[]) => Promise<void>
  onBulkHide?: (ids: string[]) => Promise<void>
  onRowClick?: (task: TaskItem) => void
}

export function TaskTable({
  tasks,
  onComplete,
  onHide,
  onReschedule,
  onPriorityChange,
  onBulkComplete,
  onBulkHide,
  onRowClick,
}: TaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    labels: false,
    dueTime: false,
    project: false,
    createdAt: false,
  })
  const [, startBulkTransition] = useTransition()

  const columns = useMemo<ColumnDef<TaskItem>[]>(
    () => [
      // ── Select ──────────────────────────────────────────────────────────────
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
      },

      // ── Title ───────────────────────────────────────────────────────────────
      {
        accessorKey: "title",
        header: ({ column }) => <SortableHeader onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} label="Title" />,
        cell: ({ row }) => onRowClick ? (
          <button
            type="button"
            onClick={() => onRowClick(row.original)}
            className="font-medium text-sm leading-snug line-clamp-2 text-left hover:underline cursor-pointer"
          >
            {row.original.title}
          </button>
        ) : (
          <span className="font-medium text-sm leading-snug line-clamp-2">
            {row.original.title}
          </span>
        ),
      },

      // ── Priority ────────────────────────────────────────────────────────────
      {
        accessorKey: "priorityManual",
        header: ({ column }) => <SortableHeader onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} label="Priority" />,
        cell: ({ row }) => {
          if (onPriorityChange && row.original.source === "todoist") {
            const currentPriority = row.original.priorityManual ?? 1
            return (
              <Select
                value={String(currentPriority)}
                onValueChange={(v) => {
                  const next = parseInt(v, 10)
                  if (!Number.isNaN(next)) void onPriorityChange(row.original.id, next)
                }}
              >
                <SelectTrigger className="h-7 w-[92px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-xs">Urgent</SelectItem>
                  <SelectItem value="4" className="text-xs">High</SelectItem>
                  <SelectItem value="3" className="text-xs">Medium</SelectItem>
                  <SelectItem value="1" className="text-xs">Normal</SelectItem>
                </SelectContent>
              </Select>
            )
          }
          const p = row.original.priorityManual
          if (!p || p < 3) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <Badge
              variant="outline"
              className={cn("text-xs font-normal px-1.5 py-0", PRIORITY_COLORS[p])}
            >
              {PRIORITY_LABELS[p] ?? "Normal"}
            </Badge>
          )
        },
      },

      // ── Due Date ────────────────────────────────────────────────────────────
      {
        accessorKey: "dueDate",
        header: ({ column }) => <SortableHeader onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} label="Due" />,
        cell: ({ row }) => {
          const task = row.original
          if (!task.dueDate) return <span className="text-xs text-muted-foreground">—</span>
          if (onReschedule) {
            return (
              <ReschedulePopover
                taskId={task.id}
                currentDate={task.dueDate}
                isOverdue={isOverdue(task.dueDate)}
                onReschedule={async (id, date) => onReschedule(id, date)}
              />
            )
          }
          return (
            <span
              className={cn(
                "font-mono text-11",
                isOverdue(task.dueDate) ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {task.dueDate}
            </span>
          )
        },
      },

      // ── Time ─────────────────────────────────────────────────────────────────
      {
        accessorKey: "dueTime",
        header: () => <span className="text-xs font-semibold tracking-wide text-[#8A8A8A]">Time</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const time = row.original.dueTime
          if (!time) return <span className="text-11 text-[#ABABAB]">—</span>
          return <span className="font-mono text-11 text-[#8A8A8A]">{time}</span>
        },
      },

      // ── Source ──────────────────────────────────────────────────────────────
      {
        accessorKey: "source",
        header: () => <span className="text-xs font-semibold tracking-wide text-[#8A8A8A]">Source</span>,
        enableSorting: false,
        cell: ({ row }) => <SourceBadge source={row.original.source} />,
      },

      // ── Labels ──────────────────────────────────────────────────────────────
      {
        id: "labels",
        header: () => <span className="text-xs font-semibold tracking-wide text-[#8A8A8A]">Labels</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const labels = parseLabels(row.original.labels)
          if (labels.length === 0) return <span className="text-xs text-[#ABABAB]">—</span>
          return (
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 2).map((l) => (
                <Badge key={l} variant="secondary" className="text-10 px-1.5 py-0 font-normal rounded-md">
                  {l}
                </Badge>
              ))}
              {labels.length > 2 && (
                <Badge variant="secondary" className="text-10 px-1.5 py-0 font-normal rounded-md">
                  +{labels.length - 2}
                </Badge>
              )}
            </div>
          )
        },
      },

      // ── Project ─────────────────────────────────────────────────────────────
      {
        id: "project",
        header: () => <span className="text-xs font-semibold tracking-wide text-[#8A8A8A]">Project</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const meta = parseMetadata(row.original.metadata)
          const project = typeof meta.projectName === "string" ? meta.projectName : null
          if (!project) return <span className="text-xs text-[#ABABAB]">—</span>
          return <span className="text-xs text-[#8A8A8A]">{project}</span>
        },
      },

      // ── Created ─────────────────────────────────────────────────────────────
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} label="Created" />,
        cell: ({ row }) => {
          const created = row.original.createdAt
          if (!created) return <span className="text-11 text-[#ABABAB]">—</span>
          const diff = Date.now() - new Date(created).getTime()
          const days = Math.floor(diff / 86400000)
          const label = days < 1 ? "today" : days < 7 ? `${days}d ago` : days < 14 ? "1w ago" : `${Math.floor(days / 7)}w ago`
          return <span className="text-11 text-[#ABABAB]">{label}</span>
        },
      },

    ],
    [onPriorityChange, onReschedule, onRowClick],
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: !!(onComplete || onHide),
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedIds = selectedRows.map((r) => r.original.id)

  function handleBulkComplete() {
    if (!onBulkComplete || selectedIds.length === 0) return
    startBulkTransition(async () => {
      await onBulkComplete(selectedIds)
      setRowSelection({})
    })
  }

  function handleBulkHide() {
    if (!onBulkHide || selectedIds.length === 0) return
    startBulkTransition(async () => {
      await onBulkHide(selectedIds)
      setRowSelection({})
    })
  }

  const hidableColumns = table
    .getAllColumns()
    .filter((col) => col.getCanHide())

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 min-h-8">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs">
              {selectedIds.length} selected
            </span>
            {onBulkComplete && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={handleBulkComplete}>
                <Check className="size-3" />
                Complete
              </Button>
            )}
            {onBulkHide && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={handleBulkHide}>
                <EyeOff className="size-3" />
                Hide
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setRowSelection({})}>
              Clear
            </Button>
          </div>
        ) : (
          <div />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1 ml-auto px-2">
              Columns
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hidableColumns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                className="capitalize text-xs"
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(!!v)}
              >
                {col.id === "priorityManual" ? "Priority" : col.id === "dueDate" ? "Due" : col.id === "dueTime" ? "Time" : col.id === "createdAt" ? "Created" : col.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#EFEFEF] bg-white dark:bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-[#F5F4F2] dark:bg-muted hover:bg-[#F5F4F2] dark:hover:bg-muted border-b border-[#EFEFEF]">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-11 px-3 text-xs font-semibold tracking-wide text-[#8A8A8A]",
                      header.id === "select" && "w-10",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  No tasks.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "group border-b border-[#F5F4F2]",
                    idx % 2 === 1 && "bg-[#F8F7F5] dark:bg-muted/30",
                    row.original.isCompleted && "opacity-60",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-3",
                        cell.column.id === "select" && "w-10",
                        cell.column.id === "title" && "max-w-[300px]",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {tasks.length > 0 && (
        <p className="text-xs text-[#ABABAB] px-4 py-2.5">
          {table.getFilteredRowModel().rows.length} task{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
          {" · "}
          {tasks.filter((t) => t.isCompleted).length} completed
        </p>
      )}
    </div>
  )
}
