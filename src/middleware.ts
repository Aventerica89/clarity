import { proxy } from "./lib/proxy"

export default proxy

export const config = {
  matcher: [
    "/api/plaid/:path*",
    "/api/webhooks/plaid",
    "/api/ai/:path*",
    "/api/auth/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|pwa|manifest.json|login|signup).*)",
  ],
}
