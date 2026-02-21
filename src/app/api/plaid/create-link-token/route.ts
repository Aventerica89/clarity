import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createPlaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const client = createPlaidClient()
    const response = await client.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "Clarity",
      products: [...PLAID_PRODUCTS],
      country_codes: [...PLAID_COUNTRY_CODES],
      language: "en",
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: unknown) {
    const plaidErr = err as { response?: { status?: number; data?: unknown }; message?: string }
    console.error("[plaid] create-link-token error:", {
      message: plaidErr?.message,
      status: plaidErr?.response?.status,
      data: JSON.stringify(plaidErr?.response?.data),
      clientId: process.env.PLAID_CLIENT_ID?.slice(0, 8),
      env: process.env.PLAID_ENV,
    })
    return NextResponse.json({ error: "Failed to create link token" }, { status: 502 })
  }
}
