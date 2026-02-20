# Developer Log

Technical log. Updated on every deploy.

<!-- Entries added automatically by deploy hook -->

### 2026-02-20 · latest · v0.1.0
FIX     ai-client — remove spurious x-app:cli header from OAuth token path (authToken alone is correct per manifesto)

### 2026-02-20 02:00 · 5088e99 · v0.1.0
FIX     ai-coach — switch back to Claude.ai OAuth via @anthropic-ai/sdk + x-app: cli header
CHORE   settings — restore Claude AI card (anthropic provider), remove Gemini card
CHORE   dashboard — check anthropic token for CoachPanel, not gemini
CHORE   coach-panel — update prop name and copy to reflect Claude.ai OAuth

### 2026-02-20 00:46 · 44a911d · v0.1.0
FEAT    ai-coach — switch AI provider to Gemini via REST (removes Anthropic dependency)
CHORE   settings — remove Claude AI section, Gemini is now the only AI provider
FIX     coach-panel — update prop name and UI copy to reflect Gemini

### 2026-02-20 00:10 · 6c2dc39 · v0.1.0
FIX     ai-coach — require sk-ant-api key, reject OAuth tokens with clear error
FIX     settings — update label/description to direct users to console.anthropic.com
FIX     ai-connect-form — surface server error message instead of generic failure text

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
