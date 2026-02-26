"use client"

import { cn } from "@/lib/utils"

export interface SpendingInstitution {
  id: string
  name: string
  accountIds: string[]
}

interface AccountSidebarProps {
  institutions: SpendingInstitution[]
  selected: string // "all" or institution id
  onSelect: (id: string) => void
}

export function AccountSidebar({ institutions, selected, onSelect }: AccountSidebarProps) {
  return (
    <nav className="hidden md:flex flex-col gap-0.5 min-w-[160px] pr-4 border-r border-border">
      <SidebarItem
        label="All Accounts"
        active={selected === "all"}
        onClick={() => onSelect("all")}
      />
      {institutions.map((inst) => (
        <SidebarItem
          key={inst.id}
          label={inst.name}
          active={selected === inst.id}
          onClick={() => onSelect(inst.id)}
        />
      ))}
    </nav>
  )
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-clarity-amber/15 text-clarity-amber"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}
