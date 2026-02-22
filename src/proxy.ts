import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const ipIdentifier = (req: NextRequest): string =>
  req.headers.get("x-forwarded-for") ?? "unknown"

async function applyRateLimit(
  pathname: string,
  req: NextRequest,
): Promise<NextResponse | null> {
  // Lazy-import so a broken Upstash env doesn't crash the proxy on module load.
  try {
    const { plaidRatelimit, coachRatelimit, authRatelimit } = await import(
      "@/lib/ratelimit"
    )

    type Limiter = typeof plaidRatelimit
    let limiter: Limiter | null = null
    let identifier: string

    if (pathname.startsWith("/api/webhooks/plaid")) {
      limiter = plaidRatelimit
      identifier = "plaid-webhook"
    } else if (pathname.startsWith("/api/plaid")) {
      limiter = plaidRatelimit
      identifier = ipIdentifier(req)
    } else if (pathname.startsWith("/api/ai/")) {
      limiter = coachRatelimit
      identifier = ipIdentifier(req)
    } else if (pathname.startsWith("/api/auth/")) {
      limiter = authRatelimit
      identifier = ipIdentifier(req)
    } else {
      return null
    }

    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
          },
        },
      )
    }
  } catch {
    // Fail open: if Upstash is unavailable, let the request through.
  }

  return null
}

export async function proxy(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request.nextUrl.pathname, request)
  if (rateLimitResponse) return rateLimitResponse

  // Plaid webhooks are server-to-server — no session cookie expected
  if (request.nextUrl.pathname === "/api/webhooks/plaid") {
    return NextResponse.next()
  }

  // Auth routes must be accessible without a session (OAuth flow, sign-in, sign-up)
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/plaid/:path*",
    "/api/webhooks/plaid",
    "/api/ai/:path*",
    "/api/auth/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|pwa|manifest.json|login|signup).*)",
  ],
}
