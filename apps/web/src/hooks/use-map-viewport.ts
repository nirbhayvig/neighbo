import { useMap } from "@vis.gl/react-google-maps"
import { useCallback } from "react"
import type { GeoLocation } from "./use-geolocation"
import { MINNEAPOLIS_CENTER } from "./use-geolocation"

/**
 * Programmatic map control hook.
 *
 * Must be called from a component rendered inside <APIProvider>.
 * Wraps useMap() with convenient helpers for panning and fitting bounds.
 */
export function useMapViewport(userLocation?: GeoLocation | null) {
  const map = useMap()

  /** Smoothly pan and optionally zoom to a coordinate */
  const panTo = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      if (!map) return
      map.panTo({ lat, lng })
      if (zoom !== undefined) {
        map.setZoom(zoom)
      }
    },
    [map]
  )

  /** Fit the map to show all given locations with padding */
  const fitBounds = useCallback(
    (locations: GeoLocation[], paddingPx = 80) => {
      if (!map || locations.length === 0) return

      if (locations.length === 1) {
        const first = locations[0]
        if (first) panTo(first.lat, first.lng, 15)
        return
      }

      const bounds = new google.maps.LatLngBounds()
      for (const loc of locations) {
        bounds.extend({ lat: loc.lat, lng: loc.lng })
      }
      map.fitBounds(bounds, paddingPx)
    },
    [map, panTo]
  )

  /** Pan back to the user's current location (or Minneapolis if unavailable) */
  const recenter = useCallback(
    (zoom = 14) => {
      const target = userLocation ?? MINNEAPOLIS_CENTER
      panTo(target.lat, target.lng, zoom)
    },
    [userLocation, panTo]
  )

  /** Pan to a specific restaurant pin and highlight it */
  const focusRestaurant = useCallback(
    (location: GeoLocation) => {
      panTo(location.lat, location.lng, 16)
    },
    [panTo]
  )

  return { panTo, fitBounds, recenter, focusRestaurant, map }
}
