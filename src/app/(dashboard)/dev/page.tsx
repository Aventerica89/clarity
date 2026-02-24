import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DevWiki } from "@/components/dev/dev-wiki"

// Only these user IDs can see the dev page
const ADMIN_IDS = new Set([
  "acBCtP32MkSIBQ5scr8hJcRN0j00TAqY", // JB
])

export default async function DevPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    redirect("/")
  }

  return <DevWiki />
}
