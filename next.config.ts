import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-* required by Next.js
      "style-src 'self' 'unsafe-inline'",                 // unsafe-inline required by Tailwind
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.turso.io https://api.anthropic.com https://generativelanguage.googleapis.com https://api.todoist.com https://www.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
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
