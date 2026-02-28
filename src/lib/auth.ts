import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import * as schema from "./schema"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/tasks.readonly",
        // Drive: per-file access for Sheets, Docs, and Drive files (non-sensitive scope)
        "https://www.googleapis.com/auth/drive.file",
        // Drive appdata: hidden app folder for Clarity-specific data (non-sensitive scope)
        "https://www.googleapis.com/auth/drive.appdata",
        // Contacts: read-only contact info for email triage enrichment (sensitive scope)
        "https://www.googleapis.com/auth/contacts.readonly",
      ],
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "https://clarity.jbcloud.app",
    "https://clarity-jb-cloud-apps.vercel.app",
    "https://clarity-git-main-jb-cloud-apps.vercel.app",
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
