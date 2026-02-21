import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { plaidRatelimit, coachRatelimit, authRatelimit } from "@/lib/ratelimit"
import { Ratelimit } from "@upstash/ratelimit"

type Limiter = { limit: InstanceType<typeof Ratelimit>["limit"] }

const ipIdentifier = (req: NextRequest): string =>
  req.headers.get("x-forwarded-for") ?? "unknown"

function selectLimiter(
  pathname: string,
): { limiter: Limiter; identifier: (req: NextRequest) => string } | null {
  if (pathname.startsWith("/api/webhooks/plaid")) {
    return {
      limiter: plaidRatelimit,
      identifier: () => "plaid-webhook", // server-to-server: constant bucket
    }
  }
  if (pathname.startsWith("/api/plaid")) {
    return {
      limiter: plaidRatelimit,
      identifier: ipIdentifier,
    }
  }
  if (pathname.startsWith("/api/ai/")) {
    return {
      limiter: coachRatelimit,
      identifier: ipIdentifier,
    }
  }
  if (pathname.startsWith("/api/auth/")) {
    return {
      limiter: authRatelimit,
      identifier: ipIdentifier,
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const match = selectLimiter(request.nextUrl.pathname)
  if (match) {
    const id = match.identifier(request)
    const { success, limit, remaining, reset } = await match.limiter.limit(id)

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
  }

  // Plaid webhooks are server-to-server — no session cookie expected
  if (request.nextUrl.pathname === "/api/webhooks/plaid") {
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
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
}
