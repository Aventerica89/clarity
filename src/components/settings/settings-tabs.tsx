"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, type ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Tab {
  value: string
  label: string
  content: ReactNode
}

function SettingsTabsInner({ tabs }: { tabs: Tab[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get("tab") ?? tabs[0]?.value ?? ""

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === tabs[0]?.value) {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList variant="line" className="w-full justify-start">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function SettingsTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <Suspense>
      <SettingsTabsInner tabs={tabs} />
    </Suspense>
  )
}
