"use client"

import { useState, useEffect } from "react"
import { Cloud, Droplets, Wind, ArrowUp, ArrowDown, Sun } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface WeatherData {
  temp: number
  high: number
  low: number
  description: string
  humidity: number
  windSpeed: number
  icon: string
}

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  clear: <Sun className="size-8 text-amber-400" />,
  clouds: <Cloud className="size-8 text-slate-400" />,
  rain: <Droplets className="size-8 text-blue-400" />,
  default: <Sun className="size-8 text-amber-400" />,
}

function getWeatherIcon(icon: string): React.ReactNode {
  const key = icon.toLowerCase()
  for (const [k, v] of Object.entries(WEATHER_ICONS)) {
    if (key.includes(k)) return v
  }
  return WEATHER_ICONS.default
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch("/api/widgets/weather")
        if (!res.ok) {
          setError(true)
          return
        }
        const json = (await res.json()) as WeatherData
        setData(json)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchWeather()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Weather
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Weather
        </div>
        <p className="text-xs text-muted-foreground">
          Add OPENWEATHERMAP_API_KEY in Settings to enable weather.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Weather
      </div>
      <div className="flex items-center gap-3">
        {getWeatherIcon(data.icon)}
        <div>
          <div className="text-2xl font-bold leading-none">{Math.round(data.temp)}&deg;</div>
          <div className="text-xs text-muted-foreground capitalize">{data.description}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Droplets className="size-3" /> {data.humidity}%</span>
        <span className="flex items-center gap-1"><Wind className="size-3" /> {data.windSpeed} mph</span>
        <span className="flex items-center gap-1"><ArrowUp className="size-3" /> {Math.round(data.high)}&deg;</span>
        <span className="flex items-center gap-1"><ArrowDown className="size-3" /> {Math.round(data.low)}&deg;</span>
      </div>
    </div>
  )
}
