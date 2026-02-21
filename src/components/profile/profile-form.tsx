"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const HOUSEHOLD_OPTIONS = ["Solo", "Partner", "Family (with kids)", "Roommates"]
const SCHEDULE_OPTIONS = ["9-5", "Shift work", "Flexible", "Remote", "Self-employed"]

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

export function ProfileForm({ initial }: { initial: ProfileData | null }) {
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(field: keyof ProfileData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>About You</CardTitle>
        <CardDescription>
          This background is always included in the AI coach context — the more you fill in,
          the more personalized and relevant the advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              placeholder="e.g. Registered Nurse, Software Engineer"
              value={form.occupation ?? ""}
              onChange={(e) => set("occupation", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employer">Employer / Business</Label>
            <Input
              id="employer"
              placeholder="e.g. Banner Health, Self-employed"
              value={form.employer ?? ""}
              onChange={(e) => set("employer", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="city">City / Location</Label>
            <Input
              id="city"
              placeholder="e.g. Phoenix, AZ"
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Household</Label>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {HOUSEHOLD_OPTIONS.map((opt) => (
                <ChipButton
                  key={opt}
                  label={opt}
                  selected={form.householdType === opt}
                  onClick={() => set("householdType", form.householdType === opt ? "" : opt)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Work Schedule</Label>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {SCHEDULE_OPTIONS.map((opt) => (
              <ChipButton
                key={opt}
                label={opt}
                selected={form.workSchedule === opt}
                onClick={() => set("workSchedule", form.workSchedule === opt ? "" : opt)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lifePhase">Current life phase</Label>
          <Input
            id="lifePhase"
            placeholder="e.g. Building a SaaS while working full-time, paying off debt"
            value={form.lifePhase ?? ""}
            onChange={(e) => set("lifePhase", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sideProjects">Side projects / businesses</Label>
          <Input
            id="sideProjects"
            placeholder="e.g. VaporForge (AI SaaS), Clarity (this app)"
            value={form.sideProjects ?? ""}
            onChange={(e) => set("sideProjects", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="healthContext">Health context</Label>
          <Input
            id="healthContext"
            placeholder="e.g. Managing Type 2 diabetes, daily medications"
            value={form.healthContext ?? ""}
            onChange={(e) => set("healthContext", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="values">What matters most to you right now (1-3 things)</Label>
          <Input
            id="values"
            placeholder="e.g. Financial independence, family health, building products"
            value={form.lifeValues ?? ""}
            onChange={(e) => set("lifeValues", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Anything else the AI should always know</Label>
          <Textarea
            id="notes"
            placeholder="Free-form background info..."
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function ChipButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-7 rounded-full px-3 text-xs font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  )
}
