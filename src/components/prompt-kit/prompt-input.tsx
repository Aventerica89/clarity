"use client"

import { createContext, useContext, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

interface PromptInputContextValue {
  isLoading: boolean
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  maxHeight: number
}

const PromptInputContext = createContext<PromptInputContextValue>({
  isLoading: false,
  value: "",
  onValueChange: () => {},
  onSubmit: () => {},
  maxHeight: 160,
})

interface PromptInputProps {
  children: React.ReactNode
  isLoading?: boolean
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  maxHeight?: number
  className?: string
}

export function PromptInput({
  children,
  isLoading = false,
  value,
  onValueChange,
  onSubmit,
  maxHeight = 160,
  className,
}: PromptInputProps) {
  return (
    <PromptInputContext.Provider value={{ isLoading, value, onValueChange, onSubmit, maxHeight }}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border bg-background px-3 py-2 shadow-sm",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          className,
        )}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

interface PromptInputTextareaProps {
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function PromptInputTextarea({
  placeholder = "Ask anything...",
  className,
  disabled,
}: PromptInputTextareaProps) {
  const { value, onValueChange, onSubmit, isLoading, maxHeight } = useContext(PromptInputContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault()
      onSubmit()
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled ?? isLoading}
      rows={1}
      className={cn(
        "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        "min-h-[24px] overflow-y-hidden leading-relaxed",
        className,
      )}
    />
  )
}

interface PromptInputActionsProps {
  children: React.ReactNode
  className?: string
}

export function PromptInputActions({ children, className }: PromptInputActionsProps) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {children}
    </div>
  )
}

interface PromptInputActionProps {
  children: React.ReactNode
  tooltip?: string
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function PromptInputAction({
  children,
  tooltip,
  className,
  onClick,
  disabled,
}: PromptInputActionProps) {
  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        "hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  )
}
