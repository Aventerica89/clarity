import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Clarity",
  description: "How Clarity collects and uses your data.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: February 21, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-base font-semibold mb-2">Overview</h2>
            <p>
              Clarity is a personal productivity application operated by JBMD Creations, LLC. This
              policy explains what data we collect, how we use it, and your rights. Clarity is a
              private application — it is not a public service and is not available for general
              registration.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Data We Collect</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>
                <strong className="text-foreground">Account information</strong> — name and email
                address used to create your account.
              </li>
              <li>
                <strong className="text-foreground">Financial account data</strong> — bank account
                names, balances, and transaction history retrieved via Plaid Technologies, Inc. on
                your behalf.
              </li>
              <li>
                <strong className="text-foreground">Productivity data</strong> — tasks, calendar
                events, and reminders synced from connected services (Google Calendar, Todoist, Apple
                Reminders) at your direction.
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — basic logs needed to
                operate and debug the service (e.g., API error logs). No analytics or tracking
                pixels are used.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">How We Use Your Data</h2>
            <p className="text-muted-foreground mb-2">We use your data solely to provide the Clarity service to you:</p>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>Display your financial snapshot and productivity dashboard.</li>
              <li>Power the AI coach ("What should I do right now?") using Claude by Anthropic.</li>
              <li>Sync and refresh data from connected services on a scheduled basis.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              <strong className="text-foreground">We do not</strong> sell, rent, share, or monetize
              your personal data in any form.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Financial Data and Plaid</h2>
            <p className="text-muted-foreground">
              Bank connections are made through{" "}
              <a
                href="https://plaid.com/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-foreground"
              >
                Plaid Technologies, Inc.
              </a>
              . Your banking credentials are never transmitted to or stored by Clarity — they are
              handled entirely by Plaid. Financial data retrieved via Plaid is stored in our database
              only to display it to you and is not shared with third parties. You can disconnect any
              bank account at any time from the Settings page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Data is stored in a Turso (LibSQL) database hosted in the United States. Access is
              restricted to authenticated users who own the data. All connections are encrypted in
              transit (TLS). The application is hosted on Vercel with industry-standard security
              practices.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Third-Party Services</h2>
            <p className="text-muted-foreground mb-2">
              Clarity integrates with the following services at your direction:
            </p>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li>Plaid — financial account access</li>
              <li>Google — calendar and email</li>
              <li>Todoist — task management</li>
              <li>Anthropic — AI coach (Claude)</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Each service is governed by its own privacy policy. We only access the scopes you
              explicitly authorize.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Data Deletion</h2>
            <p className="text-muted-foreground">
              You can disconnect any integration from the Settings page at any time. To request full
              deletion of your account and all associated data, contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Contact</h2>
            <p className="text-muted-foreground">
              JBMD Creations, LLC
              <br />
              For privacy-related requests:{" "}
              <a
                href="mailto:support@jbmdcreations.com"
                className="underline underline-offset-2 text-foreground"
              >
                support@jbmdcreations.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
