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
  type Column,
} from "@tanstack/react-table"
import { ArrowUpDown, Check, ChevronDown, EyeOff, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SourceBadge } from "./source-badge"
import { ReschedulePopover } from "./reschedule-popover"
import {
  type TaskItem,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  parseLabels,
  isOverdue,
} from "@/types/task"
import { cn } from "@/lib/utils"

interface TaskTableProps {
  tasks: TaskItem[]
  onComplete?: (id: string) => void
  onHide?: (id: string) => void
  onReschedule?: (id: string, date: string) => void
  onBulkComplete?: (ids: string[]) => Promise<void>
  onBulkHide?: (ids: string[]) => Promise<void>
}

function SortableHeader({ column, label }: { column: Column<TaskItem>; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent text-xs font-medium"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1.5 size-3" />
    </Button>
  )
}

export function TaskTable({
  tasks,
  onComplete,
  onHide,
  onReschedule,
  onBulkComplete,
  onBulkHide,
}: TaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    labels: false,
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
        header: ({ column }) => <SortableHeader column={column} label="Title" />,
        cell: ({ row }) => (
          <span className="font-medium text-sm leading-snug line-clamp-2">
            {row.original.title}
          </span>
        ),
      },

      // ── Priority ────────────────────────────────────────────────────────────
      {
        accessorKey: "priorityManual",
        header: ({ column }) => <SortableHeader column={column} label="Priority" />,
        cell: ({ row }) => {
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
        header: ({ column }) => <SortableHeader column={column} label="Due" />,
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
                "font-mono text-[11px]",
                isOverdue(task.dueDate) ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {task.dueDate}
            </span>
          )
        },
      },

      // ── Source ──────────────────────────────────────────────────────────────
      {
        accessorKey: "source",
        header: () => <span className="text-xs font-medium">Source</span>,
        enableSorting: false,
        cell: ({ row }) => <SourceBadge source={row.original.source} />,
      },

      // ── Labels ──────────────────────────────────────────────────────────────
      {
        id: "labels",
        header: () => <span className="text-xs font-medium">Labels</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const labels = parseLabels(row.original.labels)
          if (labels.length === 0) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 2).map((l) => (
                <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                  {l}
                </Badge>
              ))}
              {labels.length > 2 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                  +{labels.length - 2}
                </Badge>
              )}
            </div>
          )
        },
      },

      // ── Actions ─────────────────────────────────────────────────────────────
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const task = row.original
          if (!onComplete && !onHide) return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {onComplete && (
                  <DropdownMenuItem onClick={() => onComplete(task.id)}>
                    <Check className="size-3.5 mr-2" />
                    Complete
                  </DropdownMenuItem>
                )}
                {onHide && (
                  <DropdownMenuItem onClick={() => onHide(task.id)}>
                    <EyeOff className="size-3.5 mr-2" />
                    Hide
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [onComplete, onHide, onReschedule],
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
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkComplete}>
                <Check className="size-3" />
                Complete
              </Button>
            )}
            {onBulkHide && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkHide}>
                <EyeOff className="size-3" />
                Hide
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRowSelection({})}>
              Clear
            </Button>
          </div>
        ) : (
          <div />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto">
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
                {col.id === "priorityManual" ? "Priority" : col.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-9 px-3 text-xs",
                      header.id === "select" && "w-10",
                      header.id === "actions" && "w-10",
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-2",
                        cell.column.id === "select" && "w-10",
                        cell.column.id === "actions" && "w-10",
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
        <p className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} task{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
