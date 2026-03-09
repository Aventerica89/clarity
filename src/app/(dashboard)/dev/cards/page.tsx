import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CardPlayground } from "@/components/dev/card-playground"

const ADMIN_IDS = new Set([
  "acBCtP32MkSIBQ5scr8hJcRN0j00TAqY", // JB
])

export default async function CardPlaygroundPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    redirect("/")
  }

  return <CardPlayground />
}
