"use client"

import { useEffect } from "react"

/**
 * Tracks Safari's dynamic bottom toolbar height via the visualViewport API.
 *
 * In standalone PWA mode, Safari's toolbar is absent — sets --safari-toolbar-h
 * to 0px and adds [data-standalone] to <html> for CSS targeting.
 *
 * In Safari browser mode, the toolbar expands/collapses as the user scrolls.
 * env(safe-area-inset-bottom) does NOT account for this toolbar — only the
 * home indicator. This hook bridges that gap.
 */
export function useSafariToolbar() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true

    const root = document.documentElement

    if (standalone) {
      root.setAttribute("data-standalone", "")
      root.style.setProperty("--safari-toolbar-h", "0px")
      return
    }

    root.removeAttribute("data-standalone")

    if (!window.visualViewport) {
      root.style.setProperty("--safari-toolbar-h", "0px")
      return
    }

    function onResize() {
      const offset = window.innerHeight - window.visualViewport!.height
      root.style.setProperty(
        "--safari-toolbar-h",
        `${Math.max(0, offset)}px`
      )
    }

    onResize()
    window.visualViewport.addEventListener("resize", onResize)

    return () => {
      window.visualViewport?.removeEventListener("resize", onResize)
    }
  }, [])
}
