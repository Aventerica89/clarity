# Repository Guidelines

## Project Structure & Module Organization
Clarity is a Next.js App Router project. Main code lives in `src/`: routes and API handlers in `src/app`, reusable UI in `src/components`, and shared logic/integrations in `src/lib`. Keep feature UI grouped by domain (for example `components/tasks`, `components/life-context`). Tests live both in `tests/` and colocated `__tests__` folders under `src/lib`. Static assets and PWA files are in `public/`. SQL migrations are in `supabase/migrations/`, and architecture/planning docs are in `docs/`.

## Build, Test, and Development Commands
- `npm run dev`: start local dev server.
- `npm run dev:stable`: start local dev server in webpack mode with Tailwind oxide disabled (use when Turbopack native binding fails).
- `npm run dev:auth`: run dev server with 1Password-backed env injection.
- `npm run dev:auth:stable`: same as above with webpack + no-oxide fallback.
- `npm run build`: production build check.
- `npm run start`: run built app.
- `npm run lint`: run ESLint (`eslint-config-next`).
- `npm run typecheck`: run TypeScript checks (`tsc --noEmit`).
- `npm run test`: run Vitest unit/integration tests.
- `npm run test:e2e`: run Playwright E2E tests.
- `npm run env:inject`: generate `.env.local` from `.env.local.tpl`.

## Coding Style & Naming Conventions
Use TypeScript + React function components. Match existing style: 2-space indentation, double quotes, and no semicolons. Use the `@/*` import alias (for example `@/lib/db`). Name tests `*.test.ts`. Keep shared primitives in `src/components/ui`, and place feature-specific components near their domain. Run `npm run lint` and `npm run typecheck` before opening a PR.

## Testing Guidelines
Vitest is the primary framework (`vitest.config.ts`, Node environment). Prefer fast unit tests for `src/lib` utilities and integration boundary logic. Use colocated tests when tightly coupled to a module; otherwise place cross-cutting tests in `tests/`. Example targeted run: `npm run test -- src/lib/ai/__tests__/coach.test.ts`. Add/update tests for behavior changes, especially API routes and sync logic.

## Commit & Pull Request Guidelines
Commit style is flexible, but keep messages clear and scoped (for example `fix tasks reschedule timezone bug`). Avoid noisy autosave commits on PR branches when possible. PRs should include: what changed, why, risk/rollback notes, and validation steps. Include screenshots or recordings for UI changes, plus linked issues when applicable.

## Branch Safety Rule
Never do development work directly on `main` (local or remote). Create and use a dedicated branch for every task (for example `preview/2026-03-04-work`) and review changes from preview branches before merge. Do not rewrite, force-push, or otherwise overwrite `main`.

## Security & Configuration Tips
Never commit secrets. Use `.env.example` and templates (`.env.local.tpl`, `.env.dev-auth.tpl`) as sources of truth. Keep server secrets (Turso tokens, OAuth secrets, API keys) in server-only code paths. In database access, always scope records by `userId`.

## Agent Workflow Notes
If you use local agent tooling, common workflows include `/tdd`, `/commit`, `/code-review`, and `/deploy-check`. Use them to standardize testing, commit quality, and release readiness, but ensure results still match this repository’s commands and conventions.
