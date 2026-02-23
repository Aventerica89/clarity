import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { encryptToken } from "@/lib/crypto"
import { randomBytes } from "crypto"

const TODOIST_AUTH_URL = "https://todoist.com/oauth/authorize"
const SCOPES = "data:read_write,data:delete"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const clientId = process.env.TODOIST_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "Todoist OAuth not configured" }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Generate random state and encrypt {state, userId, exp} as the cookie value
  const state = randomBytes(16).toString("hex")
  const exp = Date.now() + 5 * 60 * 1000 // 5 minutes
  const statePayload = JSON.stringify({ state, userId: session.user.id, exp })
  const encryptedState = encryptToken(statePayload)

  const authUrl = new URL(TODOIST_AUTH_URL)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", SCOPES)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("redirect_uri", `${appUrl}/api/auth/todoist/callback`)

  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set("todoist_oauth_state", encryptedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  })

  return response
}
