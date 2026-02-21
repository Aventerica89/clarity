# Clarity — Design System

## Direction

**Personality:** Warmth & Focus
**Foundation:** Cool slate structure, warm amber signal
**Depth:** Borders-only
**Feel:** Trusted advisor. Morning clarity. Signal over noise.

The interface recedes. The priority leads. Amber appears only where it matters — the clarity moment, active states, AI coach emphasis. Everything else is quiet slate.

---

## Tokens

### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64

### Colors

#### Accent (Amber — the clarity signal)
```
--clarity-amber:        oklch(0.769 0.188 70.08)   /* amber-500 — primary accent */
--clarity-amber-light:  oklch(0.828 0.189 84.429)  /* amber-400 — hover/lighter states */
--clarity-amber-muted:  oklch(0.769 0.188 70.08 / 15%) /* amber tint for coach surface */
--clarity-amber-ring:   oklch(0.769 0.188 70.08 / 40%) /* focus rings */
```

#### Foreground (text hierarchy — 4 levels)
```
--text-primary:    var(--foreground)              /* headlines, labels */
--text-secondary:  var(--muted-foreground)        /* supporting text */
--text-tertiary:   oklch(0.65 0 0)               /* metadata, timestamps (light) */
--text-muted:      oklch(0.556 0 0 / 60%)        /* disabled, placeholder */
```

Dark mode overrides:
```
--text-tertiary:   oklch(0.50 0 0)               /* metadata in dark */
--text-muted:      oklch(0.708 0 0 / 50%)
```

#### Surfaces (elevation scale)
```
Level 0 — canvas:     var(--background)          /* page background */
Level 1 — card:       var(--card)                /* standard cards */
Level 2 — raised:     slightly lighter than card /* dropdowns, popovers */
Level 3 — overlay:    var(--popover)             /* modals, tooltips */
```

Dark mode note: higher elevation = slightly lighter (2-3% lightness steps only).
Sidebar: same background as canvas, separated by border only — no color fragmentation.

#### Borders (progression)
```
--border-faint:    oklch(1 0 0 / 6%)   /* section separators in dark */
--border-default:  var(--border)       /* standard card edges */
--border-emphasis: oklch(1 0 0 / 20%) /* focused/hovered card edges */
--border-focus:    var(--clarity-amber-ring) /* focus rings */
```

#### Semantic
```
--color-success:  oklch(0.65 0.15 145)  /* green — completed, synced */
--color-warning:  oklch(0.75 0.15 85)   /* amber-adjacent — overdue */
--color-error:    var(--destructive)    /* destructive actions */
```

### Radius
Scale: 4px (inputs), 6px (buttons), 8px (cards), 10px (panels), 9999px (pills/tags)
Variable map: sm=4px, md=6px, lg=8px, xl=10px, full=9999px

### Typography
Font: Geist Sans (UI), Geist Mono (time values, counts)
Scale: 11, 12, 13 (base), 14, 16, 18, 24
Weights: 400 (body), 500 (labels, UI), 600 (headings, emphasis)
Letter-spacing: headlines -0.01em, labels 0em, metadata +0.01em

---

## Depth Strategy

**Borders-only.** No shadows anywhere except:
- Dropdown/popover menus: `box-shadow: 0 4px 12px oklch(0 0 0 / 12%)` — functional only
- Focus rings: amber-tinted outline, not shadow

Card edges: `border: 1px solid var(--border)` — quiet, not demanding.
Hover: border shifts to `--border-emphasis` only. No shadow addition.

---

## Component Patterns

### Button — Primary
- Height: 36px
- Padding: 0 14px
- Radius: 6px
- Font: 13px, 500 weight
- Background: `var(--clarity-amber)`
- Text: oklch(0.145 0 0) — dark text on amber (better contrast than white)
- Hover: `var(--clarity-amber-light)`
- Focus: amber ring

### Button — Secondary / Ghost
- Height: 36px, same radius/font
- Background: transparent → `var(--muted)` on hover
- Border: `var(--border)` for secondary variant
- No amber — amber is reserved for primary signal

### Card — Default
- Border: `1px solid var(--border)`
- Padding: 16px
- Radius: 8px
- Background: `var(--card)`
- Hover border: `var(--border-emphasis)` — subtle lift signal

### Card — Priority (Clarity Moment)
- Same structure as Card Default
- Left accent: `3px solid var(--clarity-amber)` on left edge
- Background: `var(--clarity-amber-muted)` — very subtle amber wash
- Label: amber-colored "Focus" or priority badge
- Usage: Top priority item surfaced by AI coach

### Provider Pill
- Height: 24px
- Padding: 0 10px
- Radius: 9999px (full)
- Font: 12px, 500
- Default: bg=`var(--muted)`, text=`var(--muted-foreground)`
- Selected: bg=`var(--clarity-amber)`, text=dark foreground
- Hover: text shifts to `var(--foreground)`
- Note: Amber replaces the previous primary-colored selected state

### Coach Message — Assistant
- Background: `var(--clarity-amber-muted)` — warm tint, not cold gray
- Radius: 12px (softer than user, more conversational)
- Font: 13px, 400, leading-relaxed
- Feels like a trusted note, not a data output

### Coach Message — User
- Background: `var(--clarity-amber)` — full amber
- Text: dark foreground
- Radius: 12px top-right 4px (typical chat bubble corner)

### Task Card
- Compact: 4px vertical padding, full-width
- Priority indicator: left dot, amber for P1, muted for others
- Completed: text-tertiary + strikethrough
- Due date: Geist Mono, 11px, text-tertiary

### Event Card
- Time: Geist Mono, 12px, text-secondary — left column fixed width
- Title: 13px, 500 — middle column
- Calendar dot: 6px circle, category color — right aligned

### Sidebar
- Background: same as canvas (`var(--background)`) — no color separation
- Right border: `1px solid var(--border-faint)`
- Active nav item: amber-tinted background, amber text
- Inactive: text-secondary, hover shifts to text-primary

---

## Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Amber accent over blue | Personal/warm app, morning clarity moment — blue reads enterprise/cold | 2026-02-21 |
| Borders-only depth | Already established in codebase, matches density of productivity tool | 2026-02-21 |
| Dark text on amber buttons | Better contrast than white on amber-500, also feels warmer | 2026-02-21 |
| Amber coach messages | Coach is a trusted warm presence, not a data output — needs distinction from cold muted | 2026-02-21 |
| Amber reserved for priority signal | Accent only means something if it's scarce — don't dilute it | 2026-02-21 |
| Sidebar same bg as canvas | Avoids fragmenting the visual space into "nav world" vs "content world" | 2026-02-21 |
| Priority Card left-edge amber | Stripe-inspired entity emphasis — the thing that matters gets a signal, not just another card | 2026-02-21 |
