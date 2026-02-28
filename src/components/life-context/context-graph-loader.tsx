"use client"

import dynamic from "next/dynamic"

const ContextGraph = dynamic(
  () => import("@/components/life-context/context-graph").then((m) => m.ContextGraph),
  { ssr: false, loading: () => <div className="h-[calc(100vh-200px)] flex items-center justify-center text-muted-foreground text-sm">Loading graph…</div> },
)

export function ContextGraphLoader() {
  return <ContextGraph />
}
