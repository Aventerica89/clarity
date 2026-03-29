function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`[companion] Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

export const config = {
  apiUrl: requireEnv("CLARITY_API_URL"),
  token: requireEnv("COMPANION_TOKEN"),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "60000", 10),
  timezone: process.env.CLARITY_TIMEZONE ?? "America/Phoenix",
} as const
