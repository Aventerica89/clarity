import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { fetchTodoistProjects } from "@/lib/integrations/todoist"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projects, error } = await fetchTodoistProjects(session.user.id)
  if (error) return NextResponse.json({ error }, { status: 400 })

  return NextResponse.json({ projects })
}
