import { useCallback, useEffect, useRef, useState } from "react"

// Minneapolis city center — default fallback when geolocation is unavailable
const MINNEAPOLIS_CENTER = { lat: 44.9778, lng: -93.265 } as const

export interface GeoLocation {
  lat: number
  lng: number
}

export interface GeolocationState {
  location: GeoLocation | null
  error: string | null
  loading: boolean
  /** Whether we fell back to the Minneapolis default */
  isFallback: boolean
}

/**
 * Cross-platform geolocation hook.
 *
 * Priority:
 * 1. Capacitor @capacitor/geolocation (iOS / Android native)
 * 2. navigator.geolocation (mobile web / desktop)
 * 3. Minneapolis center fallback (44.9778, -93.265)
 */
export function useGeolocation(): GeolocationState & { requestLocation: () => void } {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
    isFallback: false,
  })

  // Cache the last known position so re-renders don't lose it
  const lastKnownRef = useRef<GeoLocation | null>(null)

  const setLocation = useCallback((location: GeoLocation, isFallback = false) => {
    lastKnownRef.current = location
    setState({ location, error: null, loading: false, isFallback })
  }, [])

  const setError = useCallback((error: string) => {
    // On error, fall back to last known or Minneapolis center
    const fallback = lastKnownRef.current ?? MINNEAPOLIS_CENTER
    setState({ location: fallback, error, loading: false, isFallback: true })
  }, [])

  const requestLocation = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    // ── 1. Try Capacitor native geolocation ─────────────────────────────────
    try {
      const { Capacitor } = await import("@capacitor/core")

      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import("@capacitor/geolocation")

        const permStatus = await Geolocation.checkPermissions()

        if (permStatus.location === "denied") {
          throw new Error("Location permission denied")
        }

        if (permStatus.location !== "granted") {
          const result = await Geolocation.requestPermissions()
          if (result.location !== "granted") {
            throw new Error("Location permission not granted")
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
        })

        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        return
      }
    } catch (capacitorError) {
      // Capacitor unavailable or permission denied — fall through to web API
    }

    // ── 2. Try browser navigator.geolocation ────────────────────────────────
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied",
          2: "Location unavailable",
          3: "Location request timed out",
        }
        setError(messages[err.code] ?? "Unknown location error")
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    )
  }, [setLocation, setError])

  // Request location on mount
  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  return { ...state, requestLocation }
}

/** Minneapolis center coordinates for use as a static default */
export { MINNEAPOLIS_CENTER }
