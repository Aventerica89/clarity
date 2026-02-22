"use client"

import { useState, useEffect, useCallback } from "react"
import { computeSunState, sunStateToGradient } from "@/lib/sun-position"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [gradient, setGradient] = useState("none")

  const updateGradient = useCallback(() => {
    const state = computeSunState()
    setGradient(sunStateToGradient(state))
  }, [])

  useEffect(() => {
    updateGradient()
    const interval = setInterval(updateGradient, 60_000)
    return () => clearInterval(interval)
  }, [updateGradient])

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-background">
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-[background] duration-[2000ms] ease-in-out"
        style={{ background: gradient }}
        aria-hidden="true"
      />
      <div className="relative z-[1] w-full max-w-md px-4">{children}</div>
    </div>
  )
}
