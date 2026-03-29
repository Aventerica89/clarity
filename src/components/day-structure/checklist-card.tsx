"use client"

import { useState } from "react"
import { Bell, BellOff, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface ChecklistItem {
  id: string
  label: string
  sortOrder: number
  isActive: boolean
}

interface ChecklistCardProps {
  id: string
  name: string
  triggerTimeRef: string
  alarmEnabled: boolean
  items: ChecklistItem[]
  completedItemIds: Set<string>
  onToggleCompletion: (itemId: string, completed: boolean) => Promise<void>
  onAddItem: (checklistId: string, label: string) => Promise<void>
  onDeleteItem: (checklistId: string, itemId: string) => Promise<void>
  onToggleAlarm: (checklistId: string, enabled: boolean) => Promise<void>
}

export function ChecklistCard({
  id,
  name,
  triggerTimeRef,
  alarmEnabled,
  items,
  completedItemIds,
  onToggleCompletion,
  onAddItem,
  onDeleteItem,
  onToggleAlarm,
}: ChecklistCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [newItemLabel, setNewItemLabel] = useState("")

  const activeItems = items.filter((i) => i.isActive)
  const completedCount = activeItems.filter((i) => completedItemIds.has(i.id)).length
  const totalCount = activeItems.length

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) return
    await onAddItem(id, newItemLabel.trim())
    setNewItemLabel("")
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2"
          >
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">{name}</CardTitle>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {completedCount}/{totalCount}
            </span>

            <button
              onClick={() => onToggleAlarm(id, !alarmEnabled)}
              className={cn(
                "p-1 rounded transition-colors",
                alarmEnabled
                  ? "text-clarity-amber hover:text-clarity-amber-light"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={alarmEnabled ? "Alarm on" : "Alarm off"}
            >
              {alarmEnabled ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Triggers at: {triggerTimeRef}
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {activeItems.map((item) => {
              const checked = completedItemIds.has(item.id)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 group py-0.5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => onToggleCompletion(item.id, !!v)}
                  />
                  <span
                    className={cn(
                      "text-sm flex-1",
                      checked && "line-through text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteItem(id, item.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Add item..."
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddItem}
              disabled={!newItemLabel.trim()}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
