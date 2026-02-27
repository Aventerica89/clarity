import DOMPurify from "dompurify"

const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "code", "del", "div", "em",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
  "li", "ol", "p", "pre", "s", "span", "strong", "table",
  "tbody", "td", "th", "thead", "tr", "u", "ul",
]

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "style",
  "width", "height", "target", "rel",
]

export function sanitizeEmailHtml(html: string): string {
  if (typeof window === "undefined") return ""
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "object", "embed"],
    // Force external links to open safely
    ADD_ATTR: ["target"],
  })
}
