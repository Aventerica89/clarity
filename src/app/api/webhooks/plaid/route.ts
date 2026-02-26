import { NextRequest, NextResponse } from "next/server"
import { importJWK, jwtVerify } from "jose"
import { createPlaidClient } from "@/lib/plaid"

// Cache verified keys for 5 minutes to avoid hammering Plaid API
const keyCache = new Map<string, { key: CryptoKey; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function getVerificationKey(kid: string): Promise<CryptoKey> {
  const cached = keyCache.get(kid)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key
  }

  const client = createPlaidClient()
  const response = await client.webhookVerificationKeyGet({ key_id: kid })
  const jwk = response.data.key
  const key = await importJWK(jwk, "ES256")

  if (key instanceof CryptoKey) {
    keyCache.set(kid, { key, expiresAt: Date.now() + CACHE_TTL_MS })
    return key
  }

  throw new Error("Failed to import JWK as CryptoKey")
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("plaid-verification") ?? ""

  if (!token) {
    return NextResponse.json(
      { error: "Missing plaid-verification header" },
      { status: 400 },
    )
  }

  // Read raw body for claim verification
  const rawBody = await request.text()

  try {
    // Extract kid from JWT header to fetch the correct key
    const headerSegment = token.split(".")[0]
    if (!headerSegment) throw new Error("Invalid JWT format")
    const headerJson = Buffer.from(headerSegment, "base64url").toString("utf-8")
    const header = JSON.parse(headerJson) as { kid?: string }
    if (!header.kid) throw new Error("No kid in JWT header")

    // Fetch and verify with the actual public key
    const key = await getVerificationKey(header.kid)
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["ES256"],
      maxTokenAge: "5 min",
    })

    // Verify the request body hash matches the JWT claim
    const bodyHash = payload.request_body_sha256
    if (bodyHash) {
      const encoder = new TextEncoder()
      const data = encoder.encode(rawBody)
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      if (hashHex !== bodyHash) {
        return NextResponse.json(
          { error: "Body hash mismatch" },
          { status: 401 },
        )
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    )
  }

  return NextResponse.json({ received: true })
}
