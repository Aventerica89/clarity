import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { MobileNav } from "@/components/mobile-nav"
import { InstallGuide } from "@/components/onboarding/install-guide"
import { UpdatePrompt } from "@/components/pwa/update-prompt"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-safe-nav md:pb-6"
          data-scroll
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <InstallGuide />
      <UpdatePrompt />
    </div>
  )
}
