# Developer Log

Technical log. Updated on every deploy.

<!-- Entries added automatically by deploy hook -->

### 2026-02-20 00:00 · ff1f167 · v0.1.0
FIX     ai-coach — restore authToken (Bearer) for Claude.ai OAuth tokens
FIX     ai-coach — use apiKey (x-api-key) only for sk-ant-api keys
FIX     ai-coach — correct model ID to claude-sonnet-4-20250514

### 2026-02-19 · 7fcd382 · v0.1.0
FEAT    ai-coach — Claude.ai OAuth + Gemini token settings, streaming coach panel
FEAT    dashboard — CoachPanel wired to /api/ai/coach streaming endpoint
FEAT    settings — Claude AI + Gemini integration cards with encrypted token storage
FIX     todoist — API v1 response shape ({ results: [] })
FIX     sync — 500 errors on first sync, routines 404
FIX     auth — BETTER_AUTH_URL trailing space, Google OAuth on custom domain
FEAT    calendar — Google Calendar sync phase 2
FEAT    tasks — Todoist sync phase 2
FEAT    devtools — widget with real PIN hash
