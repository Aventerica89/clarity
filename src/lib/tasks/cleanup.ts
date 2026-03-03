import { and, eq, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"

/**
 * Delete completed tasks older than 30 days for a user.
 * Runs as part of the cron sync to prevent unbounded task accumulation.
 */
export async function purgeOldCompletedTasks(userId: string): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const result = await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isCompleted, true),
        lt(tasks.completedAt, cutoff),
      ),
    )
    .returning({ id: tasks.id })

  return result.length
}
