import { NextRequest, NextResponse } from "next/server"

/**
 * Plaid OAuth callback — banks that use OAuth (Chase, Capital One, etc.)
 * redirect here after the user authenticates. We just redirect back to
 * settings with the oauth_state_id so react-plaid-link can resume.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const oauthStateId = url.searchParams.get("oauth_state_id") ?? ""

  const redirectUrl = new URL("/settings", url.origin)
  redirectUrl.searchParams.set("oauth_state_id", oauthStateId)

  return NextResponse.redirect(redirectUrl.toString())
}
