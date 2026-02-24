import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createPlaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const client = createPlaidClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const response = await client.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "Clarity",
      products: [...PLAID_PRODUCTS],
      country_codes: [...PLAID_COUNTRY_CODES],
      language: "en",
      webhook: `${appUrl}/api/webhooks/plaid`,
      redirect_uri: `${appUrl}/settings`,
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: unknown) {
    const plaidError = (err as { response?: { data?: unknown } })?.response?.data
    console.error("[plaid] create-link-token error:", JSON.stringify(plaidError ?? err))
    const message = (plaidError as { error_message?: string })?.error_message
      ?? "Failed to create link token"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
