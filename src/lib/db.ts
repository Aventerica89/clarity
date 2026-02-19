import { createClient } from "@supabase/supabase-js"

function getUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  return url
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
  return key
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return key
}

// Server-only client — uses service role key, bypasses RLS.
// Use only in API routes and server actions.
export function createServerClient() {
  return createClient(getUrl(), getServiceKey(), {
    auth: { persistSession: false },
  })
}

// Browser client — uses anon key, respects RLS.
// Memoized to avoid creating multiple instances.
let browserClient: ReturnType<typeof createClient> | null = null

export function createBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(getUrl(), getAnonKey())
  }
  return browserClient
}
