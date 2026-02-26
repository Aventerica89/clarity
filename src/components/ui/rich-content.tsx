"use client"

import DOMPurify from "dompurify"
import { cn } from "@/lib/utils"

interface RichContentProps {
  content: string
  className?: string
}

/**
 * Renders rich text content. Detects whether content is HTML (from Tiptap)
 * or plain text (legacy) and renders accordingly.
 * HTML is sanitized with DOMPurify before rendering.
 */
export function RichContent({ content, className }: RichContentProps) {
  const isHtml = content.startsWith("<")

  if (!isHtml) {
    return (
      <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", className)}>
        {content}
      </p>
    )
  }

  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "s", "u",
      "h2", "h3",
      "ul", "ol", "li",
      "hr", "blockquote",
      "input", "label", "div",
    ],
    ALLOWED_ATTR: ["type", "checked", "disabled", "data-type", "data-checked"],
  })

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none text-sm",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
        "[&_li]:my-0.5",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5",
        "[&_p]:my-1 [&_p]:leading-relaxed",
        "[&_hr]:my-2 [&_hr]:border-border",
        "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0",
        "[&_ul[data-type='taskList']_li]:flex [&_ul[data-type='taskList']_li]:items-start [&_ul[data-type='taskList']_li]:gap-2",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
