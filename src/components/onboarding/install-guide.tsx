"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useSession } from "@/lib/auth-client"
import {
  computeSunState,
  sunStateToGradient,
} from "@/lib/sun-position"

const STEPS_IOS = [
  {
    title: "Tap the Share button",
    description: "At the bottom of Safari, tap the share icon",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-clarity-amber"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    title: "Tap \"Add to Home Screen\"",
    description: "Scroll down in the share sheet and tap it",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-clarity-amber"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    title: "Tap \"Add\"",
    description: "Confirm in the top-right corner",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-clarity-amber"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
]

function getStorageKey(userId: string) {
  return `clarity-onboarding-seen-${userId}`
}

export function InstallGuide() {
  const { data: session } = useSession()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [isIOS, setIsIOS] = useState(false)
  const [gradient, setGradient] = useState("none")

  const userId = session?.user?.id

  // Gradient background (same pattern as auth layout)
  const updateGradient = useCallback(() => {
    const state = computeSunState()
    setGradient(sunStateToGradient(state))
  }, [])

  useEffect(() => {
    updateGradient()
    const interval = setInterval(updateGradient, 60_000)
    return () => clearInterval(interval)
  }, [updateGradient])

  // Visibility logic
  useEffect(() => {
    if (!userId) return

    // Already installed as PWA — skip entirely
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches
    if (isStandalone) return

    const key = getStorageKey(userId)
    const seen = localStorage.getItem(key)
    if (seen) return

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setVisible(true)
  }, [userId])

  function dismiss() {
    if (!userId) return
    localStorage.setItem(getStorageKey(userId), "1")
    setVisible(false)
  }

  if (!visible) return null

  const totalSteps = isIOS ? STEPS_IOS.length + 1 : 1
  const isWelcomeStep = step === 0
  const isLastStep = step === totalSteps - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Sun gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-[2000ms] ease-in-out"
        style={{ background: gradient }}
        aria-hidden="true"
      />

      <div className="relative z-[1] flex w-full max-w-sm flex-col items-center px-6">
        {/* Welcome step */}
        {isWelcomeStep && (
          <div className="flex flex-col items-center text-center">
            <Image
              src="/pwa/manifest-icon-192.maskable.png"
              alt="Clarity"
              width={72}
              height={72}
              className="mb-6 rounded-2xl"
              priority
            />
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">
              Welcome to Clarity
            </h1>
            <p className="mb-8 text-muted-foreground">
              Your AI productivity hub — tasks, calendar,
              and coach in one place.
            </p>

            {isIOS ? (
              <button
                onClick={() => setStep(1)}
                className="w-full rounded-lg bg-clarity-amber px-6 py-3 text-sm font-medium text-clarity-amber-foreground transition-colors hover:opacity-90"
              >
                Install on your iPhone
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="w-full rounded-lg bg-clarity-amber px-6 py-3 text-sm font-medium text-clarity-amber-foreground transition-colors hover:opacity-90"
              >
                Get Started
              </button>
            )}

            {isIOS && (
              <button
                onClick={dismiss}
                className="mt-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip for now
              </button>
            )}
          </div>
        )}

        {/* iOS install steps */}
        {!isWelcomeStep && isIOS && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-clarity-amber-muted">
              {STEPS_IOS[step - 1].icon}
            </div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {step} of {STEPS_IOS.length}
            </p>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">
              {STEPS_IOS[step - 1].title}
            </h2>
            <p className="mb-8 text-muted-foreground">
              {STEPS_IOS[step - 1].description}
            </p>

            {/* Step dots */}
            <div className="mb-6 flex gap-1.5">
              {STEPS_IOS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === step - 1
                      ? "bg-clarity-amber"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={isLastStep ? dismiss : () => setStep(step + 1)}
              className="w-full rounded-lg bg-clarity-amber px-6 py-3 text-sm font-medium text-clarity-amber-foreground transition-colors hover:opacity-90"
            >
              {isLastStep ? "Got it" : "Next"}
            </button>
            <button
              onClick={dismiss}
              className="mt-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
