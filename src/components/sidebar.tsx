"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/lib/nav-items"

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"

/** Sidebar items exclude changelog (shown in footer) */
const SIDEBAR_ITEMS = NAV_ITEMS.filter((item) => item.href !== "/changelog")

export function Sidebar() {
  const pathname = usePathname()
  const [triageCount, setTriageCount] = useState(0)

  useEffect(() => {
    fetch("/api/triage/count")
      .then((r) => r.json())
      .then((d) => setTriageCount(d.count ?? 0))
      .catch(() => {})
  }, [pathname])

  return (
    <aside className="hidden md:flex w-56 flex-col border-r px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Image src="/pwa/manifest-icon-192.maskable.png" alt="Clarity" width={28} height={28} className="rounded-md" />
        <span className="font-semibold text-lg">Clarity</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
          const badge = href === "/triage" && triageCount > 0 ? triageCount : undefined
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-clarity-amber/15 text-clarity-amber"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground min-w-[18px] text-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="flex items-center gap-2 px-3 py-2">
        <Link
          href="/changelog"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          v{APP_VERSION}
        </Link>
        <span className="text-muted-foreground/30">|</span>
        <Link
          href="/dev"
          className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors font-mono"
        >
          dev
        </Link>
      </div>
    </aside>
  )
}
