"use client"

import { useMemo, useState, useTransition } from "react"
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
import { ArrowUpDown, CheckCircle2, ChevronDown, X, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getScoreColor } from "./score-color"
import { Checkbox } from "@/components/ui/checkbox"
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
import { cn } from "@/lib/utils"
import type { TriageItem } from "./triage-card"
import { SourceBadge } from "./source-badge"

interface TriageTableProps {
  items: TriageItem[]
  onApprove: (item: TriageItem) => void
  onDismiss: (id: string) => Promise<void> | void
  onPushToContext: (id: string) => Promise<void> | void
  onComplete: (id: string) => Promise<void> | void
}


function SortableHeader({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent text-xs font-medium"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="ml-1.5 size-3" />
    </Button>
  )
}

export function TriageTable({
  items,
  onApprove,
  onDismiss,
  onPushToContext,
  onComplete,
}: TriageTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    snippet: false,
    aiReasoning: false,
  })
  const [, startBulkTransition] = useTransition()

  const columns = useMemo<ColumnDef<TriageItem>[]>(
    () => [
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
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortableHeader
            label="Title"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-sm leading-snug line-clamp-2">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "source",
        header: () => <span className="text-xs font-medium">Source</span>,
        cell: ({ row }) => (
          <SourceBadge source={row.original.source} />
        ),
      },
      {
        accessorKey: "aiScore",
        header: ({ column }) => (
          <SortableHeader
            label="Score"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const score = row.original.aiScore
          return <span className={cn("text-xs tabular-nums", getScoreColor(score))}>{score}/100</span>
        },
      },
      {
        accessorKey: "snippet",
        header: () => <span className="text-xs font-medium">Snippet</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {row.original.snippet || "-"}
          </span>
        ),
      },
      {
        accessorKey: "aiReasoning",
        header: () => <span className="text-xs font-medium">Reasoning</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {row.original.aiReasoning || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: () => <span className="text-xs font-medium">Status</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original
          const options = item.source === "todoist"
            ? [
              { value: "pending", label: "Pending" },
              { value: "complete", label: "Complete" },
              { value: "dismiss", label: "Dismiss" },
              { value: "push_to_context", label: "Context" },
            ]
            : [
              { value: "pending", label: "Pending" },
              { value: "approve", label: "Approve" },
              { value: "dismiss", label: "Dismiss" },
              { value: "push_to_context", label: "Context" },
            ]

          return (
            <Select
              defaultValue="pending"
              onValueChange={(v) => {
                if (v === "pending") return
                if (v === "approve") onApprove(item)
                if (v === "dismiss") void onDismiss(item.id)
                if (v === "push_to_context") void onPushToContext(item.id)
                if (v === "complete") void onComplete(item.id)
              }}
            >
              <SelectTrigger className="h-7 w-[112px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
      },
    ],
    [onApprove, onDismiss, onPushToContext, onComplete],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedIds = selectedRows.map((r) => r.original.id)

  function handleBulkDismiss() {
    if (selectedIds.length === 0) return
    startBulkTransition(async () => {
      await Promise.all(selectedIds.map((id) => onDismiss(id)))
      setRowSelection({})
    })
  }

  function handleBulkContext() {
    if (selectedIds.length === 0) return
    startBulkTransition(async () => {
      await Promise.all(selectedIds.map((id) => onPushToContext(id)))
      setRowSelection({})
    })
  }

  function handleBulkCompleteTodoist() {
    const todoistIds = selectedRows
      .map((r) => r.original)
      .filter((item) => item.source === "todoist")
      .map((item) => item.id)
    if (todoistIds.length === 0) return
    startBulkTransition(async () => {
      await Promise.all(todoistIds.map((id) => onComplete(id)))
      setRowSelection({})
    })
  }

  function handleSingleApprove() {
    if (selectedRows.length !== 1) return
    const item = selectedRows[0]?.original
    if (!item || item.source === "todoist") return
    onApprove(item)
  }

  const hidableColumns = table
    .getAllColumns()
    .filter((col) => col.getCanHide())

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 min-h-8">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs">{selectedIds.length} selected</span>
            <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={handleBulkContext}>
              <ArrowUpCircle className="size-3" />
              Context
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={handleBulkDismiss}>
              <X className="size-3" />
              Dismiss
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2" onClick={handleBulkCompleteTodoist}>
              <CheckCircle2 className="size-3" />
              Complete Todoist
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] gap-1 px-2"
              onClick={handleSingleApprove}
              disabled={selectedRows.length !== 1 || selectedRows[0]?.original.source === "todoist"}
            >
              <CheckCircle2 className="size-3" />
              Approve
            </Button>
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
                {col.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                      header.id === "status" && "w-[130px]",
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
                  No triage items.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-2",
                        cell.column.id === "select" && "w-10",
                        cell.column.id === "title" && "max-w-[360px]",
                        cell.column.id === "status" && "w-[130px]",
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

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {table.getRowModel().rows.length} item{table.getRowModel().rows.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
