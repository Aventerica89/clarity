"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Plus, RefreshCw, SunMoon } from "lucide-react"
import { toast } from "sonner"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { NAV_ITEMS } from "@/lib/nav-items"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const runAction = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  async function handleSync() {
    toast.info("Syncing all data...")
    try {
      const [triageRes, calRes, todoistRes, gmailRes] = await Promise.all([
        fetch("/api/triage/scan", { method: "POST" }),
        fetch("/api/sync/google-calendar", { method: "POST" }),
        fetch("/api/sync/todoist", { method: "POST" }),
        fetch("/api/sync/gmail", { method: "POST" }),
      ])

      const triage = (await triageRes.json()) as { added: number; errors: string[] }
      const cal = (await calRes.json()) as { synced?: number; error?: string }
      const todoist = (await todoistRes.json()) as { synced?: number; error?: string }
      const gmail = (await gmailRes.json()) as { synced?: number; error?: string }

      const errors: string[] = [...(triage.errors ?? [])]
      if (cal.error) errors.push(`Calendar: ${cal.error}`)
      if (todoist.error) errors.push(`Todoist: ${todoist.error}`)
      if (gmail.error) errors.push(`Gmail: ${gmail.error}`)

      const totalSynced =
        (triage.added ?? 0) + (cal.synced ?? 0) + (todoist.synced ?? 0) + (gmail.synced ?? 0)

      if (errors.length > 0) {
        toast.warning(`Sync done with ${errors.length} error(s)`, {
          description: errors[0],
        })
      } else if (totalSynced > 0) {
        toast.success(`Synced ${totalSynced} item${totalSynced !== 1 ? "s" : ""}`)
      } else {
        toast.info("All up to date")
      }

      router.refresh()
    } catch {
      toast.error("Sync failed")
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              keywords={item.keywords}
              onSelect={() => runAction(() => router.push(item.href))}
            >
              <item.icon className="size-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            keywords={["refresh", "update"]}
            onSelect={() => runAction(handleSync)}
          >
            <RefreshCw className="size-4" />
            Sync All Data
          </CommandItem>
          <CommandItem
            keywords={["new", "add", "todo"]}
            onSelect={() => runAction(() => router.push("/tasks?create=true"))}
          >
            <Plus className="size-4" />
            Create Task
          </CommandItem>
          <CommandItem
            keywords={["dark", "light", "mode"]}
            onSelect={() =>
              runAction(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            <SunMoon className="size-4" />
            Toggle Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
