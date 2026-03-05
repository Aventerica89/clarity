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
import { ArrowUpDown, ChevronDown, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

export interface GmailMessageRow {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  isFavorited?: boolean
}

interface EmailTableProps {
  messages: GmailMessageRow[]
  onArchive: (gmailId: string) => Promise<void> | void
  onFavoriteToggle: (gmailId: string, favorited: boolean) => Promise<void> | void
  onAddTodoist: (message: GmailMessageRow) => Promise<void> | void
  onPushContext: (message: GmailMessageRow) => Promise<void> | void
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
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

export function EmailTable({
  messages,
  onArchive,
  onFavoriteToggle,
  onAddTodoist,
  onPushContext,
}: EmailTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    snippet: false,
  })
  const [, startBulkTransition] = useTransition()

  const columns = useMemo<ColumnDef<GmailMessageRow>[]>(
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
        id: "isFavorited",
        header: () => <span className="text-xs font-medium">Star</span>,
        cell: ({ row }) => {
          const favorited = row.original.isFavorited ?? false
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onFavoriteToggle(row.original.id, !favorited)}
            >
              <Star className={cn("size-3.5", favorited && "fill-amber-500 text-amber-500")} />
            </Button>
          )
        },
      },
      {
        accessorKey: "subject",
        header: ({ column }) => (
          <SortableHeader
            label="Subject"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm font-medium leading-snug line-clamp-1">{row.original.subject}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{row.original.snippet || "-"}</p>
          </div>
        ),
      },
      {
        accessorKey: "from",
        header: ({ column }) => (
          <SortableHeader
            label="From"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-1">{row.original.from}</span>
        ),
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader
            label="Date"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{formatDate(row.original.date)}</span>
        ),
      },
      {
        accessorKey: "snippet",
        header: () => <span className="text-xs font-medium">Snippet</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-1">{row.original.snippet || "-"}</span>
        ),
      },
    ],
    [onArchive, onFavoriteToggle, onAddTodoist, onPushContext],
  )

  const table = useReactTable({
    data: messages,
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

  function handleBulkArchive() {
    if (selectedIds.length === 0) return
    startBulkTransition(async () => {
      await Promise.all(selectedIds.map((id) => onArchive(id)))
      setRowSelection({})
    })
  }

  function handleBulkTodoist() {
    if (selectedRows.length === 0) return
    startBulkTransition(async () => {
      await Promise.all(selectedRows.map((row) => onAddTodoist(row.original)))
      setRowSelection({})
    })
  }

  function handleBulkContext() {
    if (selectedRows.length === 0) return
    startBulkTransition(async () => {
      await Promise.all(selectedRows.map((row) => onPushContext(row.original)))
      setRowSelection({})
    })
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
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleBulkTodoist}>
              Todoist
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleBulkContext}>
              Context
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleBulkArchive}>
              Archive
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
                      header.id === "isFavorited" && "w-10",
                      header.id === "date" && "w-[110px]",
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
                  No emails.
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
                        cell.column.id === "isFavorited" && "w-10",
                        cell.column.id === "subject" && "max-w-[360px]",
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

      {messages.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {table.getRowModel().rows.length} email{table.getRowModel().rows.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
