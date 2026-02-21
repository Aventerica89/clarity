import { cn } from "@/lib/utils"

interface PromptSuggestionProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
}

export function PromptSuggestion({ children, onClick, className }: PromptSuggestionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm text-muted-foreground",
        "hover:bg-muted hover:text-foreground transition-colors text-left",
        className,
      )}
    >
      {children}
    </button>
  )
}

interface PromptSuggestionGroupProps {
  children: React.ReactNode
  className?: string
}

export function PromptSuggestionGroup({ children, className }: PromptSuggestionGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  )
}
