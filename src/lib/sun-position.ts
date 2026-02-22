/**
 * Simplified solar position calculator for Phoenix, AZ (33.45°N, -112.07°W).
 * Returns sun phase and interpolation factor for atmosphere gradients.
 * Timezone: America/Phoenix (UTC-7, no DST).
 */

const PHOENIX_LAT = 33.4484
const PHOENIX_LNG = -112.074
const PHOENIX_TZ_OFFSET = -7 // UTC-7, no DST

type SunPhase =
  | "night"
  | "dawn"
  | "sunrise"
  | "morning"
  | "midday"
  | "afternoon"
  | "golden-hour"
  | "sunset"
  | "dusk"

interface SunState {
  phase: SunPhase
  /** 0–1 progress through the current phase */
  progress: number
  /** Sun elevation angle in degrees (-90 to 90) */
  elevation: number
  /** Sun azimuth in degrees (0 = north, 90 = east, 180 = south, 270 = west) */
  azimuth: number
  /** Sunrise hour (decimal, local time) */
  sunriseHour: number
  /** Sunset hour (decimal, local time) */
  sunsetHour: number
}

/** Day of year (1–366) */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

/** Approximate sunrise/sunset hours for Phoenix using the equation of time */
function getSunTimes(date: Date): { sunrise: number; sunset: number } {
  const doy = dayOfYear(date)
  const latRad = (PHOENIX_LAT * Math.PI) / 180

  // Solar declination (simplified)
  const declination = -23.45 * Math.cos((2 * Math.PI * (doy + 10)) / 365)
  const decRad = (declination * Math.PI) / 180

  // Hour angle at sunrise/sunset
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad)
  const clamped = Math.max(-1, Math.min(1, cosHourAngle))
  const hourAngle = (Math.acos(clamped) * 180) / Math.PI

  // Equation of time correction (minutes)
  const b = ((2 * Math.PI) / 365) * (doy - 81)
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)

  // Solar noon in local time
  const lngCorrection = (PHOENIX_LNG - PHOENIX_TZ_OFFSET * 15) * 4 // minutes
  const solarNoon = 12 - lngCorrection / 60 - eot / 60

  const sunrise = solarNoon - hourAngle / 15
  const sunset = solarNoon + hourAngle / 15

  return { sunrise, sunset }
}

/** Approximate sun elevation and azimuth */
function getSunPosition(date: Date): { elevation: number; azimuth: number } {
  const doy = dayOfYear(date)
  const localHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600

  const latRad = (PHOENIX_LAT * Math.PI) / 180
  const declination = -23.45 * Math.cos((2 * Math.PI * (doy + 10)) / 365)
  const decRad = (declination * Math.PI) / 180

  // Hour angle
  const b = ((2 * Math.PI) / 365) * (doy - 81)
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const lngCorrection = (PHOENIX_LNG - PHOENIX_TZ_OFFSET * 15) * 4
  const solarNoon = 12 - lngCorrection / 60 - eot / 60
  const hourAngle = ((localHour - solarNoon) * 15 * Math.PI) / 180

  // Elevation
  const sinElev =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle)
  const elevation = (Math.asin(sinElev) * 180) / Math.PI

  // Azimuth
  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinElev) /
    (Math.cos(latRad) * Math.cos((elevation * Math.PI) / 180))
  let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI
  if (hourAngle > 0) azimuth = 360 - azimuth

  return { elevation, azimuth }
}

/** Convert a Date to Phoenix local time (handles any user timezone) */
function toPhoenixTime(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utc + PHOENIX_TZ_OFFSET * 3600000)
}

export function computeSunState(now: Date = new Date()): SunState {
  const local = toPhoenixTime(now)
  const hour = local.getHours() + local.getMinutes() / 60

  const { sunrise, sunset } = getSunTimes(local)
  const { elevation, azimuth } = getSunPosition(local)

  // Define phase boundaries (hours before/after sunrise/sunset)
  const dawnStart = sunrise - 1
  const sunriseEnd = sunrise + 0.5
  const morningEnd = sunrise + 3
  const middayStart = 11
  const middayEnd = 14
  const goldenStart = sunset - 1.5
  const sunsetEnd = sunset + 0.5
  const duskEnd = sunset + 1

  let phase: SunPhase
  let progress: number

  if (hour < dawnStart || hour >= duskEnd) {
    phase = "night"
    // Progress through the night (dusk to dawn)
    if (hour >= duskEnd) {
      progress = (hour - duskEnd) / (24 - duskEnd + dawnStart)
    } else {
      progress = (hour + 24 - duskEnd) / (24 - duskEnd + dawnStart)
    }
  } else if (hour < sunrise) {
    phase = "dawn"
    progress = (hour - dawnStart) / (sunrise - dawnStart)
  } else if (hour < sunriseEnd) {
    phase = "sunrise"
    progress = (hour - sunrise) / (sunriseEnd - sunrise)
  } else if (hour < morningEnd) {
    phase = "morning"
    progress = (hour - sunriseEnd) / (morningEnd - sunriseEnd)
  } else if (hour < middayStart) {
    phase = "morning"
    progress = 1
  } else if (hour < middayEnd) {
    phase = "midday"
    progress = (hour - middayStart) / (middayEnd - middayStart)
  } else if (hour < goldenStart) {
    phase = "afternoon"
    progress = (hour - middayEnd) / (goldenStart - middayEnd)
  } else if (hour < sunset) {
    phase = "golden-hour"
    progress = (hour - goldenStart) / (sunset - goldenStart)
  } else if (hour < sunsetEnd) {
    phase = "sunset"
    progress = (hour - sunset) / (sunsetEnd - sunset)
  } else {
    phase = "dusk"
    progress = (hour - sunsetEnd) / (duskEnd - sunsetEnd)
  }

  return {
    phase,
    progress: Math.max(0, Math.min(1, progress)),
    elevation,
    azimuth,
    sunriseHour: sunrise,
    sunsetHour: sunset,
  }
}

/**
 * Maps sun state to a CSS gradient string.
 * Returns inline gradient CSS (not a variable reference) for real-time mode.
 */
export function sunStateToGradient(state: SunState): string {
  const { phase, progress, azimuth } = state

  // Map azimuth to CSS position (sun moves east to west = right to left)
  // Azimuth: 90=east(right), 180=south(bottom), 270=west(left)
  const xPct = Math.max(0, Math.min(100, ((azimuth - 60) / 240) * 100))
  // Elevation mapped to Y (higher sun = higher on screen)
  const yPct = Math.max(5, Math.min(100, 100 - state.elevation * 1.2))

  const amber = "oklch(0.769 0.188 70.08"
  const amberDark = "oklch(0.828 0.189 84.429"
  const white = "oklch(0.95 0.01 260" // slightly cool white for moonlight

  switch (phase) {
    case "night": {
      // Moonlight — cool white glow from upper area, subtle
      const moonX = 75
      const moonY = 15
      const opacity = 0.06 + 0.04 * Math.sin(progress * Math.PI) // peaks mid-night
      return `radial-gradient(ellipse at ${moonX}% ${moonY}%, ${white} / ${(opacity * 1.5).toFixed(3)}) 0%, ${white} / ${(opacity * 0.4).toFixed(3)}) 35%, transparent 65%)`
    }
    case "dawn": {
      // Growing amber from the east (right side), low on the horizon
      const opacity = 0.04 + progress * 0.14
      return `radial-gradient(ellipse at 95% 90%, ${amber} / ${opacity.toFixed(3)}) 0%, ${amber} / ${(opacity * 0.3).toFixed(3)}) 40%, transparent 70%)`
    }
    case "sunrise": {
      // Intense corner glow, sun is just above horizon
      const opacity = 0.18 + progress * 0.06
      const x = 85 - progress * 15
      return `radial-gradient(ellipse at ${x.toFixed(0)}% 85%, ${amber} / ${opacity.toFixed(3)}) 0%, ${amber} / ${(opacity * 0.35).toFixed(3)}) 35%, transparent 65%)`
    }
    case "morning": {
      // Softening glow following the sun upward
      const opacity = 0.16 - progress * 0.08
      return `radial-gradient(ellipse at ${xPct.toFixed(0)}% ${yPct.toFixed(0)}%, ${amber} / ${opacity.toFixed(3)}) 0%, ${amber} / ${(opacity * 0.25).toFixed(3)}) 40%, transparent 70%)`
    }
    case "midday": {
      // Very subtle — sun overhead, minimal atmosphere
      const opacity = 0.04 + 0.02 * Math.sin(progress * Math.PI)
      return `radial-gradient(ellipse at 50% 10%, ${amber} / ${opacity.toFixed(3)}) 0%, transparent 50%)`
    }
    case "afternoon": {
      // Glow building again as sun descends
      const opacity = 0.06 + progress * 0.1
      return `radial-gradient(ellipse at ${xPct.toFixed(0)}% ${yPct.toFixed(0)}%, ${amber} / ${opacity.toFixed(3)}) 0%, ${amber} / ${(opacity * 0.3).toFixed(3)}) 40%, transparent 70%)`
    }
    case "golden-hour": {
      // Rich warm glow, wider spread, from the west
      const opacity = 0.16 + progress * 0.08
      return `radial-gradient(ellipse 130% 70% at ${xPct.toFixed(0)}% 85%, ${amber} / ${opacity.toFixed(3)}) 0%, ${amber} / ${(opacity * 0.4).toFixed(3)}) 45%, transparent 75%)`
    }
    case "sunset": {
      // Intense horizon line fading out
      const opacity = 0.24 - progress * 0.14
      return `radial-gradient(ellipse at 15% 95%, ${amber} / ${opacity.toFixed(3)}) 0%, ${amber} / ${(opacity * 0.3).toFixed(3)}) 35%, transparent 65%)`
    }
    case "dusk": {
      // Fading amber transitioning toward moonlight
      const amberOp = 0.1 * (1 - progress)
      const moonOp = 0.04 * progress
      return `radial-gradient(ellipse at 10% 90%, ${amber} / ${amberOp.toFixed(3)}) 0%, transparent 50%), radial-gradient(ellipse at 75% 15%, ${white} / ${moonOp.toFixed(3)}) 0%, transparent 50%)`
    }
    default:
      return "none"
  }
}
