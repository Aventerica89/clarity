import { readFileSync } from "node:fs"
import type { NextConfig } from "next"

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string }
const isDev = process.env.NODE_ENV !== "production"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // dev mode needs eval for Next.js runtime/HMR.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://vercel.live https://devtools.jbcloud.app https://cdn.plaid.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "frame-src https://cdn.plaid.com",
      `connect-src 'self'${isDev ? " ws: wss: http://localhost:* http://127.0.0.1:*" : ""} https://*.turso.io https://api.anthropic.com https://generativelanguage.googleapis.com https://api.todoist.com https://www.googleapis.com https://cdn.plaid.com https://production.plaid.com https://sandbox.plaid.com https://devtools.jbcloud.app`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
