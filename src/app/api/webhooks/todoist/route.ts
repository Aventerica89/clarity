import { type NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { integrations, tasks } from "@/lib/schema"
import { decryptToken } from "@/lib/crypto"
import {
  upsertTodoistTask,
  fetchTodoistTaskById,
} from "@/lib/integrations/todoist"
import { todoistWebhookRatelimit } from "@/lib/ratelimit"

interface WebhookPayload {
  event_name: string
  user_id: number
  event_data: {
    id: string
    [key: string]: unknown
  }
}

// Always return 200 to prevent Todoist retry storms
function ack() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  if (!clientSecret) {
    return ack()
  }

  // Read raw body for HMAC verification
  const rawBody = await request.text()

  // Verify HMAC-SHA256 signature
  const signature = request.headers.get("x-todoist-hmac-sha256")
  if (!signature) {
    return ack()
  }

  const expectedHmac = createHmac("sha256", clientSecret)
    .update(rawBody)
    .digest("base64")

  const sigBuf = Buffer.from(signature, "base64")
  const expectedBuf = Buffer.from(expectedHmac, "base64")
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return ack()
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return ack()
  }

  const { event_name: eventName, user_id: todoistUserId, event_data: eventData } = payload

  // Rate limit by Todoist user ID
  const rlKey = String(todoistUserId)
  const { success } = await todoistWebhookRatelimit.limit(rlKey)
  if (!success) {
    return ack()
  }

  // Find Clarity user by Todoist provider account ID
  const rows = await db
    .select({ userId: integrations.userId, accessTokenEncrypted: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(
      and(
        eq(integrations.provider, "todoist"),
        eq(integrations.providerAccountId, String(todoistUserId)),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) {
    // Unknown user — acknowledge to prevent retries
    return ack()
  }

  const { userId, accessTokenEncrypted } = row

  try {
    if (eventName === "item:added" || eventName === "item:updated") {
      if (!accessTokenEncrypted) return ack()
      const token = decryptToken(accessTokenEncrypted)
      const task = await fetchTodoistTaskById(token, eventData.id)
      if (task) {
        await upsertTodoistTask(userId, task)
      }
    } else if (eventName === "item:completed") {
      await db
        .update(tasks)
        .set({ isCompleted: true, completedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.source, "todoist"),
            eq(tasks.sourceId, eventData.id),
          ),
        )
    } else if (eventName === "item:uncompleted") {
      await db
        .update(tasks)
        .set({ isCompleted: false, completedAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.source, "todoist"),
            eq(tasks.sourceId, eventData.id),
          ),
        )
    } else if (eventName === "item:deleted") {
      await db
        .delete(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.source, "todoist"),
            eq(tasks.sourceId, eventData.id),
          ),
        )
    }

    // Update sync status on the integration row
    await db
      .update(integrations)
      .set({ syncStatus: "ok", lastSyncedAt: new Date(), lastError: null })
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, "todoist"),
        ),
      )
  } catch {
    // Non-fatal — still return 200 to avoid Todoist retry storms
  }

  return ack()
}
