# Clarity — dev:auth template (op run format)
# Used by: npm run dev:auth
# References existing #clarity credentials in 1Password
# op run injects these and merges with .env.local — nothing is written to disk

GOOGLE_CLIENT_ID=op://App Dev/Clarity/GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=op://App Dev/Clarity/GOOGLE_CLIENT_SECRET
TODOIST_CLIENT_ID=op://App Dev/Clarity/TODOIST_CLIENT_ID
TODOIST_CLIENT_SECRET=op://App Dev/Clarity/TODOIST_CLIENT_SECRET

# Auth base URL — matches PORT so OAuth callbacks land correctly
BETTER_AUTH_URL=http://localhost:${PORT:-3000}
