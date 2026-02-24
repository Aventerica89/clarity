import { type TaskItem, type DateGroup, DATE_GROUP_LABELS } from "@/types/task"
import { TaskCardEnhanced } from "./task-card-enhanced"

interface TaskGroupProps {
  group: DateGroup
  tasks: TaskItem[]
  onComplete?: (id: string) => Promise<void>
  onReschedule?: (id: string, currentDate: string) => Promise<void>
  renderSubtasks?: (taskId: string, sourceId: string | null, source: string) => React.ReactNode
}

export function TaskGroup({
  group,
  tasks,
  onComplete,
  onReschedule,
  renderSubtasks,
}: TaskGroupProps) {
  if (tasks.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {DATE_GROUP_LABELS[group]}
        <span className="ml-1.5 text-muted-foreground/60">{tasks.length}</span>
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCardEnhanced
            key={task.id}
            task={task}
            onComplete={onComplete}
            onReschedule={onReschedule}
            renderSubtasks={renderSubtasks}
          />
        ))}
      </div>
    </div>
  )
}
