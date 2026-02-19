import { readFileSync } from "fs"
import { join } from "path"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ChangelogEntry {
  type: "added" | "changed" | "removed" | "fixed"
  text: string
}

interface ChangelogVersion {
  version: string
  date: string
  entries: ChangelogEntry[]
}

const TYPE_CONFIG: Record<ChangelogEntry["type"], { symbol: string; label: string; className: string }> = {
  added:   { symbol: "+", label: "Added",   className: "text-green-600 dark:text-green-400" },
  changed: { symbol: "~", label: "Changed", className: "text-blue-600 dark:text-blue-400" },
  removed: { symbol: "-", label: "Removed", className: "text-red-600 dark:text-red-400" },
  fixed:   { symbol: "*", label: "Fixed",   className: "text-amber-600 dark:text-amber-400" },
}

function loadChangelog(): ChangelogVersion[] {
  try {
    const filePath = join(process.cwd(), "changelog.json")
    const raw = readFileSync(filePath, "utf-8")
    return JSON.parse(raw) as ChangelogVersion[]
  } catch {
    return []
  }
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default function ChangelogPage() {
  const versions = loadChangelog()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/settings/about" className="hover:text-foreground transition-colors">About</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Changelog</span>
        </div>
        <h1 className="text-2xl font-bold">What&apos;s new</h1>
        <p className="text-muted-foreground text-sm mt-1">User-facing changes in every release.</p>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changelog entries yet.</p>
      ) : (
        <div className="space-y-8">
          {versions.map((v, i) => (
            <div key={v.version}>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="font-mono text-xs">
                  v{v.version}
                </Badge>
                <span className="text-sm text-muted-foreground">{formatDate(v.date)}</span>
              </div>
              <ul className="space-y-2">
                {v.entries.map((entry, j) => {
                  const config = TYPE_CONFIG[entry.type]
                  return (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <span className={`font-mono font-bold mt-0.5 shrink-0 ${config.className}`}>
                        {config.symbol}
                      </span>
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wide mr-2 ${config.className}`}>
                          {config.label}
                        </span>
                        <span>{entry.text}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {i < versions.length - 1 && <Separator className="mt-8" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
