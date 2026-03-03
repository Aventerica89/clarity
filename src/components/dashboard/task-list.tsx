"use client"

import { TaskCard } from "./task-card"

interface TaskItem {
  id: string
  title: string
  description: string | null
  source: string
  sourceId: string | null
  dueDate: string | null
  priorityManual: number | null
  labels: string
  metadata: string
}

interface TaskListProps {
  tasks: TaskItem[]
}

export function TaskList({ tasks }: TaskListProps) {
  async function handleComplete(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" })
    if (!res.ok) throw new Error(`Failed to complete task: ${res.status}`)
  }

  return (
    <>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onComplete={handleComplete} />
      ))}
    </>
  )
}
