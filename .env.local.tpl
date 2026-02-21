# Clarity — 1Password Template
# Inject with: npm run env:inject (requires `op` CLI)

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Turso (LibSQL)
TURSO_DATABASE_URL={{ op://App Dev/#clarity / TURSO_DATABASE_URL/credential }}
TURSO_AUTH_TOKEN={{ op://App Dev/#clarity / TURSO_AUTH_TOKEN/credential }}

TOKEN_ENCRYPTION_KEY={{ op://App Dev/#clarity / TOKEN_ENCRYPTION_KEY/credential }}

BETTER_AUTH_SECRET={{ op://App Dev/#clarity / BETTER_AUTH_SECRET/credential }}
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID={{ op://App Dev/#clarity / GOOGLE_CLIENT_ID/credential }}
GOOGLE_CLIENT_SECRET={{ op://App Dev/#clarity / GOOGLE_CLIENT_SECRET/credential }}

# Anthropic — uses Claude.ai OAuth (no API key needed)
# See CLAUDE.md for the createClient() pattern

CRON_SECRET={{ op://App Dev/#clarity / CRON_SECRET/credential }}

# Plaid
PLAID_CLIENT_ID={{ op://App Dev/PLAID_CLIENT_ID/credential }}
PLAID_SECRET={{ op://App Dev/PLAID_SECRET/credential }}
PLAID_ENV=sandbox

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL={{ op://App Dev/#clarity / UPSTASH_REDIS_REST_URL/credential }}
UPSTASH_REDIS_REST_TOKEN={{ op://App Dev/#clarity / UPSTASH_REDIS_REST_TOKEN/credential }}
