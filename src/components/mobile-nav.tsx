"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar,
  CheckSquare,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Settings,
  User,
  Wallet,
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
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

const MORE_ITEMS = [
  { href: "/getting-started", label: "Getting Started", icon: HelpCircle },
  { href: "/spending", label: "Spending", icon: Wallet },
  { href: "/routines", label: "Routines", icon: RotateCcw },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/email", label: "Email", icon: Mail },
  { href: "/life-context", label: "Life Context", icon: MapPin },
  { href: "/profile", label: "Profile", icon: User },
]

const MORE_PATHS = MORE_ITEMS.map((item) => item.href)

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const moreIsActive = MORE_PATHS.includes(pathname)
  useSafariToolbar()

  return (
    <>
      <nav
        className="md:hidden fixed inset-x-0 bg-background z-50"
        style={{ bottom: "calc(var(--safari-toolbar-h, 0px) + var(--pwa-nav-nudge, 0px))" }}
      >
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
