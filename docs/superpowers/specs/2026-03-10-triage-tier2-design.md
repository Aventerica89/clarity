# Triage Components Tier 2 Refactor

## Goal

Reduce duplication and improve architecture of triage components after Tier 1 (tokens, a11y, Button) is complete.

## Changes

### 2a. Extract TriageItem type

Move from `triage-card.tsx` to `src/types/triage.ts`:
- `TriageItem` interface
- `cleanTitle`, `formatSenderName`, `getGmailDisplayTitle` helpers
- `TODOIST_PRIORITIES` constant
- URL pattern constants

Re-export from `triage-card.tsx` temporarily for backwards compat, then update all importers.

### 2b. Unify SourceBadge

Delete `src/components/triage/source-badge.tsx`. Update triage imports to use `@/components/tasks/source-badge`. Verify tasks version covers gmail, todoist, google_calendar, google_tasks sources.

### 2c. Memoize sourceMetadata

Parse `JSON.parse(item.sourceMetadata || "{}")` once per render with `useMemo` in both `TriageCard` and `SubtaskModalContent`. Derive `currentPriority`, `isOverdue`, `sender` from the memo.

### 2d. Consolidate action path

Move all API calls from card and modal to parent (`triage-content.tsx`). Card/modal become pure UI, calling async parent callbacks. Parent handles:
- API fetch to `/api/triage/${id}`
- `toast.success` on completion
- `toast.error` on failure
- UI removal of item

Card/modal keep local loading state for button spinners.

### 2e. Extract SortableHeader

Move duplicated `SortableHeader` from `triage-table.tsx` and `task-table.tsx` to `src/components/ui/sortable-header.tsx`.

### 2f. Extract useIsMobile

Move from `subtask-modal.tsx` to `src/lib/use-mobile.ts`.

## Files Modified

| File | Action |
|------|--------|
| `src/types/triage.ts` | New: type + helpers |
| `src/lib/use-mobile.ts` | New: useIsMobile hook |
| `src/components/ui/sortable-header.tsx` | New: shared component |
| `src/components/triage/source-badge.tsx` | Delete |
| `src/components/triage/triage-card.tsx` | Remove type/helpers, useMemo, remove API calls |
| `src/components/triage/subtask-modal.tsx` | useMemo, remove API calls, use shared useIsMobile |
| `src/components/triage/triage-table.tsx` | Use shared SortableHeader |
| `src/components/tasks/task-table.tsx` | Use shared SortableHeader |
| `src/app/(dashboard)/triage/triage-content.tsx` | Own API calls, toast feedback |
| All files importing TriageItem from triage-card | Update imports |
| All files importing triage SourceBadge | Update imports |

## Verification

1. `npm run typecheck` passes
2. `npm run build` succeeds
3. Card/table/modal all function correctly
4. Toast feedback on approve/dismiss/complete/pin actions
