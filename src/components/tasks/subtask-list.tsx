"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Subtask {
  id: string
  content: string
  isCompleted: boolean
  source: string
}

interface SubtaskListProps {
  taskId: string
  sourceId: string | null
  source: string
}

export function SubtaskList({ taskId, source }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/tasks/${taskId}/subtasks`)
      .then((r) => r.json())
      .then((d) => setSubtasks(d.subtasks ?? []))
      .catch(() => setSubtasks([]))
      .finally(() => setLoading(false))
  }, [taskId])

  async function handleAdd() {
    if (!newContent.trim()) return
    setAdding(true)

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      })
      const data = (await res.json()) as { subtask?: Subtask }
      if (data.subtask) {
        setSubtasks((prev) => [...prev, data.subtask!])
      }
      setNewContent("")
    } catch {
      // Best-effort
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading subtasks...
      </div>
    )
  }

  const isTodoist = source === "todoist"

  return (
    <div className="space-y-1.5">
      {subtasks.length === 0 && !isTodoist && (
        <p className="text-xs text-muted-foreground py-1">
          Subtasks only available for Todoist tasks.
        </p>
      )}

      {subtasks.map((st) => (
        <div key={st.id} className="flex items-center gap-2 py-0.5">
          <div
            className={cn(
              "size-4 rounded-full border flex items-center justify-center flex-shrink-0",
              st.isCompleted && "bg-muted border-muted-foreground/30",
            )}
          >
            {st.isCompleted && (
              <Check className="size-2.5 text-muted-foreground" />
            )}
          </div>
          <span
            className={cn(
              "text-xs",
              st.isCompleted && "line-through text-muted-foreground",
            )}
          >
            {st.content}
          </span>
        </div>
      ))}

      {isTodoist && (
        <div className="flex gap-2 pt-1">
          <Input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add subtask..."
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 flex-shrink-0"
            onClick={handleAdd}
            disabled={adding || !newContent.trim()}
          >
            {adding ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
