import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { createTodoistTaskWithSubtasks } from "@/lib/integrations/todoist"
import Anthropic from "@anthropic-ai/sdk"

interface ApproveBody {
  title: string
  projectId: string
  dueDate?: string
  subtasks: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json()) as ApproveBody

  const rows = await db
    .select()
    .from(triageQueue)
    .where(and(eq(triageQueue.id, id), eq(triageQueue.userId, session.user.id)))
    .limit(1)

  const item = rows[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { taskId, error } = await createTodoistTaskWithSubtasks(session.user.id, {
    title: body.title,
    projectId: body.projectId,
    dueDate: body.dueDate,
    subtasks: body.subtasks,
  })

  if (error) return NextResponse.json({ error }, { status: 400 })

  await db.update(triageQueue)
    .set({ status: "approved", reviewedAt: new Date(), todoistTaskId: taskId })
    .where(eq(triageQueue.id, id))

  return NextResponse.json({ taskId })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const rows = await db
    .select()
    .from(triageQueue)
    .where(and(eq(triageQueue.id, id), eq(triageQueue.userId, session.user.id)))
    .limit(1)

  const item = rows[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Generate subtask suggestions via Haiku
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ subtasks: [] })

  const client = new Anthropic({ apiKey })

  const prompt = [
    `For this task, suggest 3-5 concrete subtasks that would help complete it.`,
    `Task: "${item.title}"`,
    `Context: ${item.snippet}`,
    ``,
    `Return JSON only: {"subtasks": ["subtask 1", "subtask 2", ...]}`,
    `Keep each subtask under 60 characters. Be specific and actionable.`,
  ].join("\n")

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    })
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const parsed = JSON.parse(text) as { subtasks: string[] }
    return NextResponse.json({ subtasks: parsed.subtasks ?? [] })
  } catch {
    return NextResponse.json({ subtasks: [] })
  }
}
