# Changelog

All notable user-facing changes. See CHANGELOG-DEV.md for technical log.

<!-- Entries added by /changelog feature or deploy --feature flag -->

## v0.3.0 — February 24, 2026

+ Added   Unified Tasks page — filter by source, priority, and status
+ Added   Task creation with Todoist project picker and subtasks
+ Added   Reschedule tasks from the task list
+ Added   Expand Todoist tasks to view and add subtasks inline
+ Added   Gmail messages cached in database for faster email page
+ Added   GitHub Actions cron sync every 15 minutes
+ Added   Developer wiki page (admin-only)
+ Added   Plaid production bank linking — connect your real bank
~ Changed  Plaid upgraded from sandbox to production environment
~ Changed  Triage-approved items now appear on the Tasks page
* Fixed    Header sync runs all providers in parallel

## v0.2.0 — February 22, 2026

+ Added   Bank account linking via Plaid — see balances and net cash flow
+ Added   Full-page AI chat with session history and multi-turn memory
+ Added   Warmth & Focus design system — amber accent, sun-tracking gradients
+ Added   PWA install onboarding walkthrough for new users
+ Added   Automatic update prompt — no more deleting and re-adding the app
+ Added   Privacy policy page
+ Added   Profile page with About Me and Routine Costs
~ Changed  Design system audit — all pages and components aligned to new tokens
~ Changed  Login page redesigned with Clarity logo and live sun gradient
* Fixed    Google sign-in no longer asks for permission every time
* Fixed    PWA standalone mode background color mismatch
* Fixed    Content behind iOS status bar in standalone mode
* Fixed    iOS keyboard pushing layout off-screen
* Fixed    Update prompt no longer flashes and disappears

## v0.1.0 — February 19, 2026

+ Added   Daily "Today" view showing unified tasks and calendar events
+ Added   Google Calendar sync — events pulled automatically
+ Added   Todoist sync — tasks pulled and kept in sync
+ Added   AI coach — ask "What should I do right now?" and get a direct answer
+ Added   Routine builder with streak tracking
+ Added   Settings page with connected integrations
