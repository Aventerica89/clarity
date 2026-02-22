"use client"

import { useState, useEffect, useCallback } from "react"
import { Sun, Moon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { computeSunState, sunStateToGradient } from "@/lib/sun-position"

type AtmosphereMode =
  | "off"
  | "realtime"
  | "sunrise-corner"
  | "first-light"
  | "dawn-wash"
  | "horizon-line"
  | "golden-hour"
  | "moonlight"

const MODE_OPTIONS: { value: AtmosphereMode; label: string; icon: "sun" | "moon" | "none" }[] = [
  { value: "off", label: "Off", icon: "none" },
  { value: "realtime", label: "Real Time", icon: "sun" },
  { value: "sunrise-corner", label: "Sunrise Corner", icon: "sun" },
  { value: "first-light", label: "First Light", icon: "sun" },
  { value: "dawn-wash", label: "Dawn Wash", icon: "sun" },
  { value: "horizon-line", label: "Horizon Line", icon: "sun" },
  { value: "golden-hour", label: "Golden Hour", icon: "sun" },
  { value: "moonlight", label: "Moonlight", icon: "moon" },
]

const STATIC_GRADIENTS: Record<string, string> = {
  "sunrise-corner": "var(--gradient-sunrise-corner)",
  "first-light": "var(--gradient-first-light)",
  "dawn-wash": "var(--gradient-dawn-wash)",
  "horizon-line": "var(--gradient-horizon-line)",
  "golden-hour": "var(--gradient-golden-hour)",
  moonlight:
    "radial-gradient(ellipse at 80% 10%, oklch(0.95 0.01 260 / 10%) 0%, oklch(0.95 0.01 260 / 3%) 35%, transparent 65%)",
}

const STORAGE_KEY = "clarity-atmosphere-mode"

function getStoredMode(): AtmosphereMode {
  if (typeof window === "undefined") return "realtime"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && MODE_OPTIONS.some((o) => o.value === stored)) {
    return stored as AtmosphereMode
  }
  return "realtime"
}

export function ChatAtmosphere() {
  const [mode, setMode] = useState<AtmosphereMode>("realtime")
  const [gradient, setGradient] = useState("none")
  const [open, setOpen] = useState(false)
  const [phaseLabel, setPhaseLabel] = useState("")

  // Load stored preference on mount
  useEffect(() => {
    setMode(getStoredMode())
  }, [])

  const updateGradient = useCallback(() => {
    if (mode === "off") {
      setGradient("none")
      setPhaseLabel("")
      return
    }

    if (mode === "realtime") {
      const state = computeSunState()
      setGradient(sunStateToGradient(state))
      const phaseName = state.phase.replace("-", " ")
      setPhaseLabel(phaseName.charAt(0).toUpperCase() + phaseName.slice(1))
      return
    }

    setGradient(STATIC_GRADIENTS[mode] ?? "none")
    setPhaseLabel("")
  }, [mode])

  // Update gradient on mode change and on interval for realtime
  useEffect(() => {
    updateGradient()

    if (mode !== "realtime") return

    // Update every 60 seconds for real-time tracking
    const interval = setInterval(updateGradient, 60_000)
    return () => clearInterval(interval)
  }, [mode, updateGradient])

  function handleSelect(value: AtmosphereMode) {
    setMode(value)
    localStorage.setItem(STORAGE_KEY, value)
    setOpen(false)
  }

  const currentOption = MODE_OPTIONS.find((o) => o.value === mode)
  const isNight = phaseLabel === "Night" || mode === "moonlight"

  return (
    <>
      {/* Gradient overlay layer — covers the entire chat area */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-[background] duration-[2000ms] ease-in-out"
        style={{ background: gradient }}
        aria-hidden="true"
      />

      {/* Dropdown selector — positioned top-right of chat area */}
      <div className="absolute top-3 right-3 z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className={cn(
              "flex min-h-[32px] items-center gap-1.5 rounded-full px-3 py-1",
              "text-xs font-medium transition-colors",
              "bg-background/60 backdrop-blur-sm border border-border/50",
              "text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {isNight ? (
              <Moon className="size-3" />
            ) : mode !== "off" ? (
              <Sun className="size-3" />
            ) : null}
            <span>{currentOption?.label ?? "Off"}</span>
            {phaseLabel && mode === "realtime" && (
              <span className="text-clarity-amber text-[10px] font-normal">
                {phaseLabel}
              </span>
            )}
            <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setOpen(false)}
              />
              <div
                className={cn(
                  "absolute right-0 top-full mt-1 z-30 w-44",
                  "rounded-lg border bg-popover/95 backdrop-blur-md p-1",
                  "shadow-lg",
                )}
              >
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors",
                      mode === option.value
                        ? "bg-clarity-amber/10 text-clarity-amber font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {option.icon === "moon" ? (
                      <Moon className="size-3 shrink-0" />
                    ) : option.icon === "sun" ? (
                      <Sun className="size-3 shrink-0" />
                    ) : (
                      <div className="size-3 shrink-0" />
                    )}
                    <span>{option.label}</span>
                    {option.value === "realtime" && (
                      <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                        auto
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
