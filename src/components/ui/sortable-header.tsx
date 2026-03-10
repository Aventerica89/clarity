import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SortableHeaderProps {
  label: string
  onClick: () => void
}

export function SortableHeader({ label, onClick }: SortableHeaderProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent text-xs font-medium"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="ml-1.5 size-3" />
    </Button>
  )
}
