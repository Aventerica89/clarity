"use client"

import { TaskCard } from "./task-card"

interface TaskItem {
  id: string
  title: string
  source: string
  sourceId: string | null
  dueDate: string | null
  priorityManual: number | null
  labels: string
}

interface TaskListProps {
  tasks: TaskItem[]
}

export function TaskList({ tasks }: TaskListProps) {
  async function handleComplete(taskId: string) {
    await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" })
  }

  return (
    <>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onComplete={handleComplete} />
      ))}
    </>
  )
}
