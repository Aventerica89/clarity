"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TasksFilterBar } from "@/components/tasks/tasks-filter-bar"
import { TaskCardEnhanced } from "@/components/tasks/task-card-enhanced"
import { TaskTable } from "@/components/tasks/task-table"
import { CreateTaskModal } from "@/components/tasks/create-task-modal"
import { TaskDetailModal } from "@/components/tasks/task-detail-modal"
import { SubtaskList } from "@/components/tasks/subtask-list"
import {
  type TaskItem,
  type TaskFilters,
} from "@/types/task"
import { CLARITY_SYNC_COMPLETED_EVENT } from "@/lib/client-sync-events"

const GRID_PAGE_SIZE = 9

export default function TasksPage() {
  const [tab, setTab] = useState("active")
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"grid2" | "grid3" | "table">("table")
  const [gridPage, setGridPage] = useState(1)
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
      setError(null)
    } catch {
      setError("Failed to load tasks. Try refreshing.")
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [tab, filters.source, filters.priority, filters.dateFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    const onSyncCompleted = () => {
      fetchTasks()
    }
    window.addEventListener(CLARITY_SYNC_COMPLETED_EVENT, onSyncCompleted)
    return () => window.removeEventListener(CLARITY_SYNC_COMPLETED_EVENT, onSyncCompleted)
  }, [fetchTasks])

  // Reset grid page when any filter/search changes
  useEffect(() => {
    setGridPage(1)
  }, [search, filters.project, filters.source, filters.priority, filters.dateFilter, tab, view])

  // Extract unique project names from task metadata
  const projects = useMemo(() => {
    const names = new Set<string>()
    for (const t of tasks) {
      try {
        const meta = JSON.parse(t.metadata) as Record<string, unknown>
        if (typeof meta.projectName === "string") names.add(meta.projectName)
      } catch { /* ignore */ }
    }
    return Array.from(names).sort()
  }, [tasks])

  // Client-side filter: search text + project
  const displayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filters.project !== "all") {
        try {
          const meta = JSON.parse(t.metadata) as Record<string, unknown>
          if (meta.projectName !== filters.project) return false
        } catch {
          return false
        }
      }
      return true
    })
  }, [tasks, search, filters.project])

  // Grid pagination
  const gridTasks = displayTasks.slice(0, gridPage * GRID_PAGE_SIZE)
  const hasMoreGrid = displayTasks.length > gridTasks.length
  const gridClass = view === "grid3"
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    : "grid grid-cols-1 lg:grid-cols-2 gap-4"

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

  async function handlePriorityChange(id: string, priority: number) {
    const prev = tasks
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, priorityManual: priority } : t)))
    try {
      const res = await fetch(`/api/tasks/${id}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      })
      if (!res.ok) throw new Error(`priority ${res.status}`)
    } catch {
      setTasks(prev)
    }
  }

  async function handleBulkComplete(ids: string[]) {
    await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", ids }),
    })
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)))
  }

  function handleDescriptionSaved(id: string, description: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, description } : t)))
  }

  async function handleBulkHide(ids: string[]) {
    await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide", ids }),
    })
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tasks</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New Task
        </Button>
      </div>

      <TasksFilterBar
        filters={filters}
        onChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        projects={projects}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="hidden">Hidden</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-6">
          {loading ? (
            <TasksLoadingSkeleton />
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : displayTasks.length === 0 ? (
            <TasksEmptyState tab={tab} hasSearch={search.length > 0} />
          ) : view === "table" ? (
            <TaskTable
              tasks={displayTasks}
              onComplete={tab === "active" ? handleComplete : undefined}
              onHide={tab === "active" ? handleHide : undefined}
              onReschedule={tab === "active" ? handleReschedule : undefined}
              onPriorityChange={tab === "active" ? handlePriorityChange : undefined}
              onBulkComplete={tab === "active" ? handleBulkComplete : undefined}
              onBulkHide={tab === "active" ? handleBulkHide : undefined}
              onRowClick={setSelectedTask}
            />
          ) : (
            <div className="space-y-4">
              <div className={gridClass}>
                {gridTasks.map((task) => (
                  <TaskCardEnhanced
                    key={task.id}
                    task={task}
                    onComplete={tab === "active" ? handleComplete : undefined}
                    onHide={tab === "active" ? handleHide : undefined}
                    onReschedule={tab === "active" ? handleReschedule : undefined}
                    renderSubtasks={(taskId, sourceId, source) => (
                      <SubtaskList taskId={taskId} sourceId={sourceId} source={source} />
                    )}
                  />
                ))}
              </div>
              {hasMoreGrid && (
                <button
                  onClick={() => setGridPage((p) => p + 1)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Show {Math.min(GRID_PAGE_SIZE, displayTasks.length - gridTasks.length)} more
                </button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchTasks}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={tab === "active" ? (id) => { handleComplete(id); setSelectedTask(null) } : undefined}
        onHide={tab === "active" ? (id) => { handleHide(id); setSelectedTask(null) } : undefined}
        onDescriptionSaved={handleDescriptionSaved}
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

function TasksEmptyState({ tab, hasSearch }: { tab: string; hasSearch: boolean }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-sm">
        {hasSearch
          ? "No tasks match your search."
          : tab === "active"
            ? "No active tasks. Create one or connect Todoist in Settings."
            : tab === "hidden"
              ? "No hidden tasks."
              : "No completed tasks yet."}
      </p>
    </div>
  )
}
