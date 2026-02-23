# Developer Log

Technical log. Updated on every deploy.

<!-- Entries added automatically by deploy hook -->

### 2026-02-22 · b91150f · v0.2.0
FEAT    pwa — service worker with version-based caching and update prompt
FEAT    devtools — hide widget on mobile (desktop-only via media query)

### 2026-02-22 · fd0c56b · v0.2.0
FIX     pwa — correct standalone background-color from broken hsl() to oklch
FIX     auth — remove forced Google consent prompt on every login
FIX     header — add safe-area-inset-top for PWA standalone mode

### 2026-02-22 · b901d45 · v0.2.0
FEAT    onboarding — post-signup iOS install walkthrough
FEAT    onboarding — "Do not show again" checkbox, settings reset toggle

### 2026-02-22 · be4cc20 · v0.2.0
FEAT    chat — full-page AI chat with session history and prompt-kit UI
FEAT    chat — sun-tracking gradient atmosphere background
FEAT    coach — persistent multi-turn memory in chat sessions
FIX     design — complete audit pass 2 for all dashboard components

### 2026-02-21 · 50745c6 · v0.2.0
FEAT    design — Warmth & Focus design system with amber tokens
FEAT    design — interface-design system config (.interface-design/system.md)
FIX     design — align dashboard components to design tokens

### 2026-02-21 · fce23bb · v0.2.0
FEAT    pwa — Apple HIG mobile compliance pass
FEAT    pwa — Sunrise icon set and splash screens (44 assets)
FIX     layout — h-screen to h-dvh for iOS keyboard

### 2026-02-20 · 729f25c · v0.2.0
FEAT    plaid — full Plaid banking integration (link, sync, webhook, settings UI)
FEAT    plaid — net cash flow computation from transactions
FEAT    security — Upstash rate limiting for plaid, coach, auth routes
FEAT    privacy — privacy policy page for Plaid production access
FEAT    profile — Profile page with About Me and Routine Costs

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
