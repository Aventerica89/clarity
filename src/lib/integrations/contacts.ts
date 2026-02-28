import { google } from "googleapis"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"

export interface Contact {
  name: string
  emails: string[]
  phone?: string
  organization?: string
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
}

async function getAuthenticatedPeopleClient(userId: string) {
  const rows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1)
  const googleAccount = rows[0] ?? null
  if (!googleAccount?.accessToken) return null

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: googleAccount.accessToken,
    refresh_token: googleAccount.refreshToken ?? undefined,
    expiry_date: googleAccount.accessTokenExpiresAt?.getTime(),
  })

  return google.people({ version: "v1", auth: oauth2Client })
}

export async function fetchContacts(
  userId: string,
  maxResults = 50,
): Promise<{ contacts: Contact[]; error?: string }> {
  const people = await getAuthenticatedPeopleClient(userId)
  if (!people) return { contacts: [], error: "google_not_connected" }

  try {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: Math.min(maxResults, 1000),
      personFields: "names,emailAddresses,phoneNumbers,organizations",
      sortOrder: "LAST_MODIFIED_DESCENDING",
    })

    const connections = res.data.connections ?? []
    const contacts: Contact[] = []

    for (const person of connections) {
      const name = person.names?.[0]?.displayName
      const emails = (person.emailAddresses ?? [])
        .map((e) => e.value ?? "")
        .filter(Boolean)
      if (!name || emails.length === 0) continue

      contacts.push({
        name,
        emails,
        phone: person.phoneNumbers?.[0]?.value ?? undefined,
        organization: person.organizations?.[0]?.name ?? undefined,
      })
    }

    return { contacts }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED") || msg.includes("insufficient")) {
      return { contacts: [], error: "contacts_scope_missing" }
    }
    return { contacts: [], error: msg }
  }
}

export function lookupContactByEmail(contacts: Contact[], email: string): Contact | null {
  const normalized = email.toLowerCase()
  return contacts.find((c) =>
    c.emails.some((e) => e.toLowerCase() === normalized)
  ) ?? null
}
