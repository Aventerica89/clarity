import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { lifeContextItems } from "@/lib/schema"
import { createTodoistTaskWithSubtasks } from "@/lib/integrations/todoist"

const actionSchema = z.object({
  action: z.enum(["push_to_context", "add_to_todoist"]),
  title: z.string().min(1).max(200),
  snippet: z.string().max(5000),
  projectId: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const body = parsed.data

  if (body.action === "push_to_context") {
    await db.insert(lifeContextItems).values({
      userId: session.user.id,
      title: body.title,
      description: body.snippet,
      urgency: "active",
    })
    return NextResponse.json({ ok: true })
  }

  if (body.action === "add_to_todoist") {
    const result = await createTodoistTaskWithSubtasks(session.user.id, {
      title: body.title,
      projectId: body.projectId ?? "",
      subtasks: [],
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true, taskId: result.taskId })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
