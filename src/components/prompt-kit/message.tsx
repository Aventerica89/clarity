import { cn } from "@/lib/utils"
import { Markdown } from "./markdown"

interface MessageProps {
  children: React.ReactNode
  className?: string
}

export function Message({ children, className }: MessageProps) {
  return (
    <div className={cn("flex w-full gap-3", className)}>
      {children}
    </div>
  )
}

interface MessageAvatarProps {
  src?: string
  fallback: string
  className?: string
}

export function MessageAvatar({ src, fallback, className }: MessageAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium select-none",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={fallback} className="h-full w-full rounded-full object-cover" />
      ) : (
        fallback
      )}
    </div>
  )
}

interface MessageContentProps {
  children: React.ReactNode
  role?: "user" | "assistant"
  markdown?: boolean
  className?: string
}

export function MessageContent({ children, role, markdown = false, className }: MessageContentProps) {
  const isUser = role === "user"

  if (isUser) {
    return (
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          "bg-primary text-primary-foreground",
          className,
        )}
      >
        {typeof children === "string" ? (
          <span className="whitespace-pre-wrap">{children}</span>
        ) : (
          children
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex-1 text-sm leading-relaxed",
        className,
      )}
    >
      {markdown && typeof children === "string" ? (
        <Markdown>{children}</Markdown>
      ) : (
        <span className="whitespace-pre-wrap">{children}</span>
      )}
    </div>
  )
}
