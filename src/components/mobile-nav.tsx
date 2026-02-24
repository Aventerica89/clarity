"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Settings,
  User,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useSafariToolbar } from "@/lib/use-safari-toolbar"

const PRIMARY_TABS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/routines", label: "Routines", icon: RotateCcw },
  { href: "/settings", label: "Settings", icon: Settings },
]

const MORE_ITEMS = [
  { href: "/life-context", label: "Life Context", icon: MapPin },
  { href: "/profile", label: "Profile", icon: User },
]

const MORE_PATHS = MORE_ITEMS.map((item) => item.href)

function DebugBanner() {
  const [info, setInfo] = useState("")
  useEffect(() => {
    const update = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      const sai = getComputedStyle(document.documentElement).getPropertyValue("--safari-toolbar-h")
      const saib = getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)")
      const vh = window.visualViewport?.height ?? "n/a"
      const ih = window.innerHeight
      const navEl = document.querySelector("[data-debug-nav]")
      const navRect = navEl?.getBoundingClientRect()
      const navBottom = navRect ? Math.round(navRect.bottom) : "n/a"
      const navTop = navRect ? Math.round(navRect.top) : "n/a"

      const testDiv = document.createElement("div")
      testDiv.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none"
      document.body.appendChild(testDiv)
      const measuredSAIB = testDiv.getBoundingClientRect().height
      document.body.removeChild(testDiv)

      setInfo(
        `mode:${standalone ? "PWA" : "Safari"} | ` +
        `saib:${measuredSAIB}px | toolbar-h:${sai} | ` +
        `vvH:${vh} iH:${ih} | ` +
        `nav:${navTop}-${navBottom} screenH:${screen.height}`
      )
    }
    update()
    window.visualViewport?.addEventListener("resize", update)
    const t = setInterval(update, 2000)
    return () => {
      window.visualViewport?.removeEventListener("resize", update)
      clearInterval(t)
    }
  }, [])

  return (
    <div className="bg-red-600 text-white text-[10px] px-2 py-1 font-mono leading-tight z-[9999]">
      {info}
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const moreIsActive = MORE_PATHS.includes(pathname)
  useSafariToolbar()

  return (
    <>
      <nav
        data-debug-nav
        className="md:hidden fixed inset-x-0 bg-background z-50"
        style={{ bottom: "var(--safari-toolbar-h, 0px)" }}
      >
        <DebugBanner />
        <div className="flex h-tab-bar border-t">
          {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive
                    ? "text-clarity-amber"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="text-[11px] font-medium leading-none">
                  {label}
                </span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
              moreIsActive
                ? "text-clarity-amber"
                : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="size-5" />
            <span className="text-[11px] font-medium leading-none">
              More
            </span>
          </button>
        </div>
        <div className="h-safe-bottom bg-background" />
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold">
              More
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 pb-4">
            {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-clarity-amber/15 text-clarity-amber"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
