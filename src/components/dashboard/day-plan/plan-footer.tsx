"use client"

import { RefreshCw, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ModelChoice = "haiku" | "sonnet"

function formatGeneratedAt(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Phoenix",
  })
}

interface PlanFooterProps {
  model: ModelChoice
  onModelChange: (m: ModelChoice) => void
  onRegenerate: () => void
  generating: boolean
  generatedAt?: string | Date | null
  planModel?: string | null
}

export function PlanFooter({
  model,
  onModelChange,
  onRegenerate,
  generating,
  generatedAt,
  planModel,
}: PlanFooterProps) {
  return (
    <div className="flex items-center justify-between border-t pt-2.5 mt-1">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3 text-clarity-amber" />
        {generatedAt && (
          <span>
            {formatGeneratedAt(generatedAt)} &middot;{" "}
            {planModel === "sonnet" ? "Sonnet" : "Haiku"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select value={model} onValueChange={(v) => onModelChange(v as ModelChoice)}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="haiku">Haiku</SelectItem>
            <SelectItem value="sonnet">Sonnet</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onRegenerate}
          disabled={generating}
          aria-label="Regenerate plan"
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
