"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Layers, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { PinnedItemType } from "@/types/life-context"
import { SEVERITY_LABELS, type Severity } from "@/types/life-context"

interface ContextSearchResult {
  id: string
  title: string
  urgency: string
}

interface PinToContextDialogProps {
  sourceType: PinnedItemType
  sourceId: string
  sourceTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PinToContextDialog({
  sourceType,
  sourceId,
  sourceTitle,
  open,
  onOpenChange,
}: PinToContextDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContextSearchResult[]>([])
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
        const params = new URLSearchParams({
          q: q.trim(),
          pinned_type: sourceType,
          pinned_id: sourceId,
        })
        const res = await fetch(`/api/life-context/search?${params}`)
        if (res.ok) {
          const data = (await res.json()) as { results: ContextSearchResult[] }
          setResults(data.results)
        } else {
          setError("Search failed.")
        }
      } catch {
        setError("Network error.")
      } finally {
        setLoading(false)
      }
    },
    [sourceType, sourceId],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setPinning(null)
      setError(null)
    }
  }, [open])

  async function handleSelect(contextItem: ContextSearchResult) {
    setPinning(contextItem.id)
    setError(null)
    try {
      const res = await fetch(`/api/life-context/${contextItem.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinnedType: sourceType,
          pinnedId: sourceId,
        }),
      })
      if (res.ok) {
        toast.success(`Pinned to "${contextItem.title}"`)
        onOpenChange(false)
      } else if (res.status === 409) {
        setError("Already pinned to this context.")
      } else {
        setError("Failed to create pin.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setPinning(null)
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pin to context"
      description={`Pin "${sourceTitle}" to a life context item`}
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Search life context items..."
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
          <CommandEmpty>No context items found.</CommandEmpty>
        )}
        {!loading && query.trim().length === 0 && (
          <CommandEmpty>Start typing to search...</CommandEmpty>
        )}
        {!loading && results.length > 0 && (
          <CommandGroup heading="Life Context">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.id}-${item.title}`}
                onSelect={() => handleSelect(item)}
                disabled={pinning !== null}
              >
                <Layers className="size-4 shrink-0 text-violet-500" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="truncate text-sm">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {SEVERITY_LABELS[item.urgency as Severity] ?? item.urgency}
                  </span>
                </div>
                {pinning === item.id && (
                  <Loader2 className="ml-auto size-3 animate-spin" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
