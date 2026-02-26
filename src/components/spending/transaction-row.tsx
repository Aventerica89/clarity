"use client"

import { MoreHorizontal, Repeat, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type TransactionItem,
  formatCents,
  getCategoryLabel,
} from "@/types/transaction"
import { cn } from "@/lib/utils"

interface TransactionRowProps {
  transaction: TransactionItem
  onToggleRecurring: (id: string) => void
}

export function TransactionRow({ transaction, onToggleRecurring }: TransactionRowProps) {
  const displayName = transaction.merchantName ?? transaction.name
  const isInflow = transaction.amountCents < 0

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {transaction.isRecurring && (
            <Repeat className="size-3 text-muted-foreground shrink-0" />
          )}
          {transaction.pending && (
            <span className="text-[10px] text-muted-foreground italic">pending</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {getCategoryLabel(transaction.category)}
          </span>
          {transaction.accountLabel && (
            <>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground capitalize">
                {transaction.accountLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <span
        className={cn(
          "text-sm font-medium tabular-nums whitespace-nowrap",
          isInflow ? "text-green-600 dark:text-green-400" : "text-foreground",
        )}
      >
        {formatCents(transaction.amountCents)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onToggleRecurring(transaction.id)}>
            <Repeat className="size-4 mr-2" />
            {transaction.isRecurring ? "Remove from recurring" : "Mark as recurring"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Tag className="size-4 mr-2" />
            Change category
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
