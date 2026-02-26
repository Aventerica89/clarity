import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link
            href="/settings"
            className="hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <ChevronRight className="size-3.5" />
          <span>About</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/pwa/manifest-icon-192.maskable.png"
            alt="Clarity"
            width={28}
            height={28}
            className="rounded-md"
          />
          <h1 className="text-2xl font-bold">Clarity</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          A personal AI productivity hub. Unifies your tasks, calendar, and
          habits into one daily view — with Claude as your focus coach.
        </p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground">Version</span>
          <span className="font-mono">v{APP_VERSION}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground">Stack</span>
          <span>Next.js + Turso + Claude</span>
        </div>
        <hr className="border-border" />
        <div className="flex flex-wrap gap-4 pt-1">
          <Link
            href="/getting-started"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Getting Started
          </Link>
          <Link
            href="/changelog"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Changelog
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
        </div>
      </div>
    </div>
  )
}
