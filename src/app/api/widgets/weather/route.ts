import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { integrations } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import { decryptToken } from "@/lib/crypto"

// Phoenix, AZ coordinates
const LAT = 33.4484
const LON = -112.074

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to get API key from integrations table
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.user.id),
          eq(integrations.provider, "openweathermap"),
        ),
      )
      .limit(1)

    let apiKey: string | undefined

    if (integration?.accessTokenEncrypted) {
      apiKey = decryptToken(integration.accessTokenEncrypted)
    }

    // Fallback to env var
    if (!apiKey) {
      apiKey = process.env.OPENWEATHERMAP_API_KEY
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenWeatherMap API key configured" },
        { status: 422 },
      )
    }

    const url = new URL("https://api.openweathermap.org/data/2.5/weather")
    url.searchParams.set("lat", String(LAT))
    url.searchParams.set("lon", String(LON))
    url.searchParams.set("appid", apiKey)
    url.searchParams.set("units", "imperial")

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } })
    if (!res.ok) {
      return NextResponse.json(
        { error: "Weather API error" },
        { status: res.status },
      )
    }

    const data = await res.json()

    return NextResponse.json({
      temp: data.main?.temp ?? 0,
      high: data.main?.temp_max ?? 0,
      low: data.main?.temp_min ?? 0,
      description: data.weather?.[0]?.description ?? "Unknown",
      humidity: data.main?.humidity ?? 0,
      windSpeed: Math.round(data.wind?.speed ?? 0),
      icon: data.weather?.[0]?.main ?? "Clear",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
