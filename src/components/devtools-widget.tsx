"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

export function DevtoolsWidget() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Only load the widget on viewports wider than 768px (non-mobile).
    const mq = window.matchMedia("(min-width: 768px)")
    setIsDesktop(mq.matches)

    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  if (!isDesktop) return null

  return (
    <Script
      src="https://devtools.jbcloud.app/widget.js"
      data-project="ohnfqin4-qsi1-w2ez"
      data-pin="21bbda1d1794b7a4ae9bb53822b5787bc637d91e9131847a9ac86572bcdd3de0"
      strategy="lazyOnload"
    />
  )
}
