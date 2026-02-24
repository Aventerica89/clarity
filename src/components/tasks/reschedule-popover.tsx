"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ReschedulePopoverProps {
  taskId: string
  currentDate: string
  isOverdue: boolean
  onReschedule: (taskId: string, newDate: string) => Promise<void>
}

export function ReschedulePopover({
  taskId,
  currentDate,
  isOverdue,
  onReschedule,
}: ReschedulePopoverProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(currentDate)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleSave() {
    if (!date || date === currentDate) {
      setOpen(false)
      return
    }
    setSaving(true)
    await onReschedule(taskId, date)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 font-mono text-[11px] rounded px-1.5 py-0.5",
          "transition-colors",
          isOverdue
            ? "text-destructive bg-destructive/10"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        <Calendar className="size-3" />
        {isOverdue ? "Overdue" : currentDate}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border bg-popover p-3 shadow-md space-y-2 min-w-[200px]">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
