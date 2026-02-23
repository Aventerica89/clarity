import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { decryptToken } from "@/lib/crypto"
import { saveTodoistToken, fetchTodoistUserProfile, syncTodoistTasks } from "@/lib/integrations/todoist"

const TODOIST_TOKEN_URL = "https://todoist.com/oauth/access_token"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const settingsBase = `${appUrl}/settings?tab=integrations`

  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const returnedState = searchParams.get("state")

  // Handle user cancellation
  if (!code || searchParams.get("error")) {
    const response = NextResponse.redirect(`${settingsBase}&todoist=cancelled`)
    response.cookies.delete("todoist_oauth_state")
    return response
  }

  // Validate state cookie
  const cookieValue = request.cookies.get("todoist_oauth_state")?.value
  if (!cookieValue || !returnedState) {
    const response = NextResponse.redirect(`${settingsBase}&todoist=error`)
    response.cookies.delete("todoist_oauth_state")
    return response
  }

  let statePayload: { state: string; userId: string; exp: number }
  try {
    const decrypted = decryptToken(cookieValue)
    statePayload = JSON.parse(decrypted) as { state: string; userId: string; exp: number }
  } catch {
    const response = NextResponse.redirect(`${settingsBase}&todoist=error`)
    response.cookies.delete("todoist_oauth_state")
    return response
  }

  if (
    statePayload.state !== returnedState ||
    statePayload.userId !== session.user.id ||
    Date.now() > statePayload.exp
  ) {
    const response = NextResponse.redirect(`${settingsBase}&todoist=error`)
    response.cookies.delete("todoist_oauth_state")
    return response
  }

  // Exchange code for access token
  const clientId = process.env.TODOIST_CLIENT_ID
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    const response = NextResponse.redirect(`${settingsBase}&todoist=error`)
    response.cookies.delete("todoist_oauth_state")
    return response
  }

  let accessToken: string
  try {
    const tokenRes = await fetch(TODOIST_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/auth/todoist/callback`,
      }),
    })
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`)
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenData.access_token) {
      throw new Error(tokenData.error ?? "No access token returned")
    }
    accessToken = tokenData.access_token
  } catch {
    const response = NextResponse.redirect(`${settingsBase}&todoist=error`)
    response.cookies.delete("todoist_oauth_state")
    return response
  }

  // Fetch user profile for display name + provider account ID
  let displayName = ""
  let providerAccountId: string | undefined
  try {
    const profile = await fetchTodoistUserProfile(accessToken)
    displayName = profile.full_name || profile.email
    providerAccountId = String(profile.id)
  } catch {
    // Non-fatal — save token without display info
  }

  // Save token with OAuth metadata
  await saveTodoistToken(session.user.id, accessToken, {
    providerAccountId,
    config: {
      connectionMethod: "oauth",
      todoistDisplayName: displayName,
    },
  })

  // Trigger initial sync fire-and-forget (don't await)
  syncTodoistTasks(session.user.id).catch(() => {
    // Best-effort sync — errors logged by syncTodoistTasks itself
  })

  const response = NextResponse.redirect(`${settingsBase}&todoist=connected`)
  response.cookies.delete("todoist_oauth_state")
  return response
}
