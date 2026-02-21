import { cn } from "@/lib/utils"

interface LoaderProps {
  variant?: "typing" | "pulse" | "spinner"
  className?: string
}

export function Loader({ variant = "typing", className }: LoaderProps) {
  if (variant === "typing") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <span
        className={cn(
          "inline-block h-3.5 w-1 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom",
          className,
        )}
      />
    )
  }

  // spinner
  return (
    <div
      className={cn(
        "h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin",
        className,
      )}
    />
  )
}
