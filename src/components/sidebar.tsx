"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, MapPin, RotateCcw, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const APP_VERSION = "0.1.0"

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/routines", label: "Routines", icon: RotateCcw },
  { href: "/life-context", label: "Life Context", icon: MapPin },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-muted/30 px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">Clarity</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <Link
        href="/changelog"
        className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
      >
        v{APP_VERSION}
      </Link>
    </aside>
  )
}
