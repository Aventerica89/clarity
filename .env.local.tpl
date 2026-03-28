# Clarity — 1Password Template
# Inject with: npm run env:inject (requires `op` CLI)

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Turso (LibSQL)
TURSO_DATABASE_URL={{ op://App Dev/Clarity/TURSO_DATABASE_URL }}
TURSO_AUTH_TOKEN={{ op://App Dev/Clarity/TURSO_AUTH_TOKEN }}

TOKEN_ENCRYPTION_KEY={{ op://App Dev/Clarity/TOKEN_ENCRYPTION_KEY }}

BETTER_AUTH_SECRET={{ op://App Dev/Clarity/BETTER_AUTH_SECRET }}
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID={{ op://App Dev/Clarity/GOOGLE_CLIENT_ID }}
GOOGLE_CLIENT_SECRET={{ op://App Dev/Clarity/GOOGLE_CLIENT_SECRET }}

# Anthropic — uses Claude.ai OAuth (no API key needed)
# See CLAUDE.md for the createClient() pattern

CRON_SECRET={{ op://App Dev/Clarity/CRON_SECRET }}

# Plaid
PLAID_CLIENT_ID={{ op://App Dev/PLAID_CLIENT_ID/credential }}
PLAID_SECRET={{ op://App Dev/PLAID_SECRET/credential }}
PLAID_ENV=sandbox

# Todoist OAuth
TODOIST_CLIENT_ID={{ op://App Dev/Clarity/TODOIST_CLIENT_ID }}
TODOIST_CLIENT_SECRET={{ op://App Dev/Clarity/TODOIST_CLIENT_SECRET }}

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL={{ op://App Dev/Clarity/UPSTASH_REDIS_REST_URL }}
UPSTASH_REDIS_REST_TOKEN={{ op://App Dev/Clarity/UPSTASH_REDIS_REST_TOKEN }}
