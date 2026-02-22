"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { CheckIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ProfileData = {
  occupation: string | null
  employer: string | null
  city: string | null
  householdType: string | null
  workSchedule: string | null
  lifePhase: string | null
  healthContext: string | null
  sideProjects: string | null
  lifeValues: string | null
  notes: string | null
}

type Status = "idle" | "saving" | "saved"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

type ProfileFormContextValue = {
  form: ProfileData
  set: (field: keyof ProfileData, value: string) => void
  save: () => void
  status: Status
}

const ProfileFormContext = createContext<ProfileFormContextValue | null>(null)

function useProfileForm() {
  const ctx = useContext(ProfileFormContext)
  if (!ctx) {
    throw new Error("useProfileForm must be used inside <ProfileFormRoot>")
  }
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const HOUSEHOLD_OPTIONS = [
  "Solo",
  "Partner",
  "Family (with kids)",
  "Roommates",
]

const SCHEDULE_OPTIONS = [
  "9-5",
  "Shift work",
  "Flexible",
  "Remote",
  "Self-employed",
]

/* -------------------------------------------------------------------------- */
/*  Root (Context Provider)                                                   */
/* -------------------------------------------------------------------------- */

function ProfileFormRoot({
  initial,
  children,
  className,
}: {
  initial: ProfileData | null
  children: ReactNode
  className?: string
}) {
  const [form, setForm] = useState<ProfileData>({
    occupation: initial?.occupation ?? "",
    employer: initial?.employer ?? "",
    city: initial?.city ?? "",
    householdType: initial?.householdType ?? "",
    workSchedule: initial?.workSchedule ?? "",
    lifePhase: initial?.lifePhase ?? "",
    healthContext: initial?.healthContext ?? "",
    sideProjects: initial?.sideProjects ?? "",
    lifeValues: initial?.lifeValues ?? "",
    notes: initial?.notes ?? "",
  })
  const [status, setStatus] = useState<Status>("idle")

  const set = useCallback((field: keyof ProfileData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setStatus("idle")
  }, [])

  const save = useCallback(async () => {
    setStatus("saving")
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setStatus("saved")
  }, [form])

  return (
    <ProfileFormContext.Provider value={{ form, set, save, status }}>
      <div className={cn("space-y-6", className)}>{children}</div>
    </ProfileFormContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Field (text input)                                                        */
/* -------------------------------------------------------------------------- */

function ProfileFormField({
  field,
  label,
  placeholder,
  className,
}: {
  field: keyof ProfileData
  label: string
  placeholder?: string
  className?: string
}) {
  const { form, set } = useProfileForm()
  const id = `profile-${field}`

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={form[field] ?? ""}
        onChange={(e) => set(field, e.target.value)}
        className="focus-visible:border-clarity-amber/40 focus-visible:ring-clarity-amber/20"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  TextareaField                                                             */
/* -------------------------------------------------------------------------- */

function ProfileFormTextarea({
  field,
  label,
  placeholder,
  rows = 3,
  className,
}: {
  field: keyof ProfileData
  label: string
  placeholder?: string
  rows?: number
  className?: string
}) {
  const { form, set } = useProfileForm()
  const id = `profile-${field}`

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        value={form[field] ?? ""}
        onChange={(e) => set(field, e.target.value)}
        className="focus-visible:border-clarity-amber/40 focus-visible:ring-clarity-amber/20"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  ChipGroup                                                                 */
/* -------------------------------------------------------------------------- */

function ProfileFormChipGroup({
  field,
  label,
  options,
  className,
}: {
  field: keyof ProfileData
  label: string
  options: readonly string[]
  className?: string
}) {
  const { form, set } = useProfileForm()

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => (
          <ProfileFormChip
            key={opt}
            label={opt}
            selected={form[field] === opt}
            onClick={() => set(field, form[field] === opt ? "" : opt)}
          />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Chip                                                                      */
/* -------------------------------------------------------------------------- */

function ProfileFormChip({
  label,
  selected,
  onClick,
  className,
}: {
  label: string
  selected: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-[44px] rounded-full px-4 py-2.5 text-xs font-medium transition-colors",
        selected
          ? "bg-clarity-amber/10 text-clarity-amber ring-1 ring-inset ring-clarity-amber/20"
          : "border text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Actions (save button + saved indicator)                                   */
/* -------------------------------------------------------------------------- */

function ProfileFormActions({ className }: { className?: string }) {
  const { save, status } = useProfileForm()

  return (
    <div className={cn("flex items-center gap-3 pt-2", className)}>
      <button
        type="button"
        onClick={save}
        disabled={status === "saving"}
        className={cn(
          "inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors",
          "bg-clarity-amber text-clarity-amber-foreground hover:bg-clarity-amber/90",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {status === "saving" && (
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
        )}
        {status === "saving" ? "Saving..." : "Save profile"}
      </button>
      {status === "saved" && (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <CheckIcon className="size-4" aria-hidden="true" />
          Saved
        </span>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Composed Form (convenience export)                                        */
/* -------------------------------------------------------------------------- */

export function ProfileForm({
  initial,
  className,
}: {
  initial: ProfileData | null
  className?: string
}) {
  return (
    <ProfileFormRoot initial={initial} className={className}>
      <div className="grid gap-6 sm:grid-cols-2">
        <ProfileFormField
          field="occupation"
          label="Occupation"
          placeholder="e.g. Registered Nurse, Software Engineer"
        />
        <ProfileFormField
          field="employer"
          label="Employer / Business"
          placeholder="e.g. Banner Health, Self-employed"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ProfileFormField
          field="city"
          label="City / Location"
          placeholder="e.g. Phoenix, AZ"
        />
        <ProfileFormChipGroup
          field="householdType"
          label="Household"
          options={HOUSEHOLD_OPTIONS}
        />
      </div>

      <ProfileFormChipGroup
        field="workSchedule"
        label="Work Schedule"
        options={SCHEDULE_OPTIONS}
      />

      <ProfileFormField
        field="lifePhase"
        label="Current life phase"
        placeholder="e.g. Building a SaaS while working full-time"
      />

      <ProfileFormField
        field="sideProjects"
        label="Side projects / businesses"
        placeholder="e.g. VaporForge (AI SaaS), Clarity (this app)"
      />

      <ProfileFormField
        field="healthContext"
        label="Health context"
        placeholder="e.g. Managing Type 2 diabetes, daily medications"
      />

      <ProfileFormField
        field="lifeValues"
        label="What matters most right now (1-3 things)"
        placeholder="e.g. Financial independence, family health"
      />

      <ProfileFormTextarea
        field="notes"
        label="Anything else the AI should always know"
        placeholder="Free-form background info..."
      />

      <ProfileFormActions />
    </ProfileFormRoot>
  )
}

/* -------------------------------------------------------------------------- */
/*  Named exports for compound composition                                    */
/* -------------------------------------------------------------------------- */

export {
  ProfileFormRoot,
  ProfileFormField,
  ProfileFormTextarea,
  ProfileFormChipGroup,
  ProfileFormChip,
  ProfileFormActions,
}
