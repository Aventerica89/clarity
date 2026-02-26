"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarDays, CheckSquare, Layers, Loader2, Mail } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { ContextPin, PinnedItemType } from "@/types/life-context"

interface SearchResult {
  type: PinnedItemType
  id: string
  title: string
  subtitle: string | null
}

const TYPE_ICONS: Record<PinnedItemType, typeof CheckSquare> = {
  task: CheckSquare,
  email: Mail,
  event: CalendarDays,
  context: Layers,
}

const TYPE_LABELS: Record<PinnedItemType, string> = {
  task: "Tasks",
  email: "Emails",
  event: "Events",
  context: "Context Items",
}

interface PinSearchDialogProps {
  contextItemId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPinCreated: (pin: ContextPin) => void
}

export function PinSearchDialog({
  contextItemId,
  open,
  onOpenChange,
  onPinCreated,
}: PinSearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [pinning, setPinning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 1) {
        setResults([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/life-context/${contextItemId}/pins/search?q=${encodeURIComponent(q.trim())}`,
        )
        if (res.ok) {
          const data = (await res.json()) as { results: SearchResult[] }
          setResults(data.results)
        } else {
          setError("Search failed. Please try again.")
        }
      } catch {
        setError("Network error.")
      } finally {
        setLoading(false)
      }
    },
    [contextItemId],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setPinning(null)
      setError(null)
    }
  }, [open])

  async function handleSelect(result: SearchResult) {
    setPinning(result.id)
    try {
      const res = await fetch(`/api/life-context/${contextItemId}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinnedType: result.type,
          pinnedId: result.id,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { pin: ContextPin }
        onPinCreated(data.pin)
        onOpenChange(false)
      } else if (res.status === 409) {
        setError("This item is already pinned.")
      } else {
        setError("Failed to create pin.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setPinning(null)
    }
  }

  // Group results by type
  const grouped = new Map<PinnedItemType, SearchResult[]>()
  for (const r of results) {
    const group = grouped.get(r.type) ?? []
    group.push(r)
    grouped.set(r.type, group)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pin item"
      description="Search for a task, email, event, or context item to pin"
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Search tasks, emails, events, context..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {error && (
          <div className="px-4 py-2 text-xs text-destructive">{error}</div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && query.trim().length > 0 && results.length === 0 && (
          <CommandEmpty>No items found.</CommandEmpty>
        )}
        {!loading && query.trim().length === 0 && (
          <CommandEmpty>Start typing to search...</CommandEmpty>
        )}
        {!loading &&
          (["task", "email", "event", "context"] as PinnedItemType[]).map((type) => {
            const group = grouped.get(type)
            if (!group || group.length === 0) return null
            const Icon = TYPE_ICONS[type]
            return (
              <CommandGroup key={type} heading={TYPE_LABELS[type]}>
                {group.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.id}-${result.title}`}
                    onSelect={() => handleSelect(result)}
                    disabled={pinning !== null}
                  >
                    <Icon className="size-4 shrink-0" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="truncate text-sm">{result.title}</span>
                      {result.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                    {pinning === result.id && (
                      <Loader2 className="ml-auto size-3 animate-spin" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
      </CommandList>
    </CommandDialog>
  )
}
