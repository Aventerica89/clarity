# Apple Design Context — Clarity

## Product
- **Name**: Clarity
- **Description**: AI-powered productivity hub that unifies tasks, calendar, and context into a single prioritized daily view
- **Category**: Productivity
- **Stage**: Development (shipped MVP, active feature development)

## Platforms
| Platform | Supported | Min OS | Notes |
|----------|-----------|--------|-------|
| iOS      | Yes (PWA) | iOS 16+ | Primary mobile target — Safari/Chrome PWA |
| iPadOS   | Yes (PWA) | iPadOS 16+ | Sidebar layout at md+ breakpoint |
| macOS    | Yes (browser) | macOS 13+ | Full sidebar, desktop layout |
| tvOS     | No        | —      | Out of scope |
| watchOS  | No        | —      | Out of scope |
| visionOS | No        | —      | Out of scope |

## Technology
- **UI Framework**: React 19 + Next.js 16 (App Router) — web, not native
- **Architecture**: Single-window PWA (web app, not native app)
- **Styling**: Tailwind CSS v4 + shadcn/ui + oklch design tokens
- **Apple Technologies**: N/A (web stack — no Swift/SwiftUI)
- **Mobile Native**: Expo (React Native) — planned Phase 5

## Design System
- **Base**: Custom design system — "Warmth & Focus" personality
- **Brand Accent**: `--clarity-amber` (`oklch(0.769 0.188 70.08)`) — scarce, signal-only
- **Typography**: Geist Sans (UI) + Geist Mono (counts/timestamps)
- **Dark Mode**: Supported via `next-themes` with `class` attribute
- **Dynamic Type**: Not implemented (web — system font scaling via browser zoom)
- **Token file**: `src/app/globals.css` (Tailwind v4 `@theme inline`)
- **Design system doc**: `.interface-design/system.md`

## Navigation Architecture
- **Desktop (md+)**: Left sidebar — 6 items: Today, Chat, Routines, Life Context, Profile, Settings
- **Mobile (<md)**: **NONE** — sidebar is `hidden md:flex`; no mobile nav exists yet
- **HIG target pattern**: Bottom tab bar (iOS) / Sidebar (iPad/Mac)
- **Active state**: `bg-clarity-amber/15 text-clarity-amber` on active item

## PWA Compliance Status
- [x] `apple-mobile-web-app-capable` meta tag — via `metadata.appleWebApp.capable`
- [x] `mobile-web-app-capable` meta tag — Next.js infers from manifest
- [x] `apple-mobile-web-app-status-bar-style` — via `metadata.appleWebApp.statusBarStyle: "default"`
- [x] PWA manifest — `public/manifest.json` (id, scope, display_override: standalone)
- [ ] Maskable icons (192px + 512px) — manifest references `icon-192-maskable.png` + `icon-512-maskable.png`; **icons not yet generated**
- [ ] Splash screens (iPhone + iPad sizes) — not yet configured
- [x] `overscroll-behavior: none` on html/body — `globals.css`
- [x] `-webkit-tap-highlight-color: transparent` — `globals.css`
- [x] Safe area insets — mobile nav `padding-bottom: env(safe-area-inset-bottom)`, body uses `.pb-safe-nav`
- [x] Bottom tab bar for mobile — `src/components/mobile-nav.tsx` (Today, Chat, Routines, Settings; 4 items; 11px labels; amber active)
- [x] `viewportFit: cover` — `layout.tsx` viewport export
- [x] `display-mode: standalone` CSS override — `globals.css`

## Accessibility
- **Target Level**: Baseline
- **Key Considerations**: Color contrast (amber on white must pass WCAG AA), keyboard nav on desktop
- **Status**: Not formally audited

## Users
- **Primary Persona**: 2-3 person household (owner + family/partner); high task volume, calendar-heavy
- **Key Use Cases**: Morning planning, "what should I do right now?" coach, routine tracking
- **Known Challenges**: Mobile experience is unfinished — sidebar hidden on small screens leaves no nav
- **Use Context**: On-the-go (iPhone), desk (Mac), brief check-ins throughout the day
