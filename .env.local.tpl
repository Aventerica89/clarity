# Clarity — 1Password Template
# Inject with: npm run env:inject (requires `op` CLI)

NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_URL={{ op://App Dev/#clarity / SUPABASE_URL/credential }}
SUPABASE_ANON_KEY={{ op://App Dev/#clarity / SUPABASE_ANON_KEY/credential }}
SUPABASE_SERVICE_ROLE_KEY={{ op://App Dev/#clarity / SUPABASE_SERVICE_ROLE_KEY/credential }}

TOKEN_ENCRYPTION_KEY={{ op://App Dev/#clarity / TOKEN_ENCRYPTION_KEY/credential }}

BETTER_AUTH_SECRET={{ op://App Dev/#clarity / BETTER_AUTH_SECRET/credential }}
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID={{ op://App Dev/#clarity / GOOGLE_CLIENT_ID/credential }}
GOOGLE_CLIENT_SECRET={{ op://App Dev/#clarity / GOOGLE_CLIENT_SECRET/credential }}

ANTHROPIC_API_KEY={{ op://Business/ANTHROPIC_API_KEY/credential }}

CRON_SECRET={{ op://App Dev/#clarity / CRON_SECRET/credential }}

GOOGLE_WEBHOOK_SECRET={{ op://App Dev/#clarity / GOOGLE_WEBHOOK_SECRET/credential }}
