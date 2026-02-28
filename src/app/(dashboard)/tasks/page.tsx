"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TasksFilterBar } from "@/components/tasks/tasks-filter-bar"
import { TaskGroup } from "@/components/tasks/task-group"
import { CreateTaskModal } from "@/components/tasks/create-task-modal"
import { SubtaskList } from "@/components/tasks/subtask-list"
import {
  type TaskItem,
  type TaskFilters,
  type DateGroup,
  DATE_GROUP_ORDER,
  groupTasksByDate,
} from "@/types/task"

export default function TasksPage() {
  const [tab, setTab] = useState("active")
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [filters, setFilters] = useState<TaskFilters>({
    source: "all",
    priority: "all",
    project: "all",
    dateFilter: "all",
  })

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      status: tab === "active" ? "active" : tab === "hidden" ? "hidden" : "completed",
      source: filters.source,
      priority: filters.priority,
      dateFilter: filters.dateFilter ?? "all",
    })

    try {
      const res = await fetch(`/api/tasks?${params}`)
      const data = (await res.json()) as { tasks: TaskItem[] }
      setTasks(data.tasks ?? [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [tab, filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleComplete(id: string) {
    await fetch(`/api/tasks/${id}/complete`, { method: "POST" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleHide(id: string) {
    await fetch(`/api/tasks/${id}/hide`, { method: "POST" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleReschedule(id: string, newDate: string) {
    await fetch(`/api/tasks/${id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: newDate }),
    })
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dueDate: newDate } : t)),
    )
  }

  const grouped = groupTasksByDate(tasks)

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Tasks</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New Task
          </Button>
        </div>

        <TasksFilterBar filters={filters} onChange={setFilters} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="hidden">Hidden</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-6">
            {loading ? (
              <TasksLoadingSkeleton />
            ) : tasks.length === 0 ? (
              <TasksEmptyState tab={tab} />
            ) : (
              DATE_GROUP_ORDER.map((group) => (
                <TaskGroup
                  key={group}
                  group={group as DateGroup}
                  tasks={grouped[group as DateGroup]}
                  onComplete={tab === "active" ? handleComplete : undefined}
                  onHide={tab === "active" ? handleHide : undefined}
                  onReschedule={tab === "active" ? handleReschedule : undefined}
                  renderSubtasks={(taskId, sourceId, source) => (
                    <SubtaskList
                      taskId={taskId}
                      sourceId={sourceId}
                      source={source}
                    />
                  )}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
        <CreateTaskModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={fetchTasks}
        />
    </div>
  )
}

function TasksLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-3 space-y-2 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TasksEmptyState({ tab }: { tab: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-sm">
        {tab === "active"
          ? "No active tasks. Create one or connect Todoist in Settings."
          : tab === "hidden"
            ? "No hidden tasks."
            : "No completed tasks yet."}
      </p>
    </div>
  )
}
