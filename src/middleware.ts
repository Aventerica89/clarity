import { NextResponse, type NextRequest } from "next/server"

// Auth guard temporarily disabled for debugging OAuth loop.
// The betterFetch session check in Edge runtime was redirecting to /login
// even after a successful OAuth callback. Re-enable after OAuth is confirmed working.
export async function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)"],
}
