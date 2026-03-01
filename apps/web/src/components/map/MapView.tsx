import { APIProvider, Map as GoogleMap, type MapProps } from "@vis.gl/react-google-maps"
import { useCallback, useEffect, useState } from "react"
import type { GeoLocation } from "@/hooks/use-geolocation"
import { MINNEAPOLIS_CENTER } from "@/hooks/use-geolocation"
import { useMapViewport } from "@/hooks/use-map-viewport"
import type { RestaurantSummary } from "@neighbo/shared/types"
import { MapPinCard } from "./MapPinCard"
import { PinCluster } from "./PinCluster"
import { RestaurantPin } from "./RestaurantPin"

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string

// Returns distance in km (API unit). Display components convert to miles.
function haversineKm(a: GeoLocation, b: GeoLocation): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

export interface MapViewProps {
  /** Restaurants to display on the map */
  restaurants: RestaurantSummary[]
  /** Currently selected restaurant id */
  selectedId?: string | null
  /** Called when a pin or cluster child is clicked */
  onPinClick?: (id: string) => void
  /** Called when the user taps "View" on a MapPinCard to navigate to detail */
  onRestaurantOpen?: (id: string) => void
  /** User's current location (from useGeolocation) */
  userLocation?: GeoLocation | null
  /** Value slugs to filter pins by (AND logic). Empty = show all. */
  activeFilters?: string[]
  /** Custom map container className */
  className?: string
  /**
   * Increment this counter to programmatically pan the map to userLocation.
   * Each new value (compared to the previous) triggers a recenter.
   */
  recenterRequested?: number
}

/**
 * Inner component rendered inside <GoogleMap> (and therefore inside <APIProvider>).
 * Calls useMapViewport — which requires the Maps JS API context — and recenters
 * the map whenever the `recenterRequested` counter changes.
 */
function MapRecenterer({
  userLocation,
  recenterRequested,
}: {
  userLocation?: GeoLocation | null
  recenterRequested?: number
}) {
  const { recenter } = useMapViewport(userLocation)

  useEffect(() => {
    if (recenterRequested === undefined || recenterRequested === 0) return
    recenter()
  }, [recenterRequested, recenter])

  return null
}

/**
 * MapView — the full-screen Google Map.
 *
 * Wraps <APIProvider> (loads Maps JS API) and <Map> (renders the canvas).
 * Manages selected pin state and renders pins, clusters, and the info card.
 *
 * Designed to live inside the _map.tsx layout route behind the bottom drawer.
 * Fill the parent container: ensure the parent has a defined height.
 */
export function MapView({
  restaurants,
  selectedId: externalSelectedId,
  onPinClick,
  onRestaurantOpen,
  userLocation,
  activeFilters = [],
  className,
  recenterRequested,
}: MapViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)

  // Support both controlled (externalSelectedId) and uncontrolled usage
  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId

  // Filter restaurants by active value filters (AND logic)
  const visibleRestaurants =
    activeFilters.length === 0
      ? restaurants
      : restaurants.filter((r) =>
          activeFilters.every((slug) => r.values.some((v) => v.slug === slug))
        )

  const selectedRestaurant = visibleRestaurants.find((r) => r.id === selectedId) ?? null

  const handlePinClick = useCallback(
    (id: string) => {
      setInternalSelectedId((prev) => (prev === id ? null : id))
      onPinClick?.(id)
    },
    [onPinClick]
  )

  const handleCardClose = useCallback(() => {
    setInternalSelectedId(null)
  }, [])

  const handleCardTap = useCallback(
    (id: string) => {
      onRestaurantOpen?.(id)
    },
    [onRestaurantOpen]
  )

  // Close the info card when tapping the map background
  const handleMapClick = useCallback(() => {
    if (internalSelectedId) setInternalSelectedId(null)
  }, [internalSelectedId])

  const mapProps: MapProps = {
    mapId: MAP_ID || undefined,
    defaultCenter: userLocation ?? MINNEAPOLIS_CENTER,
    defaultZoom: 13,
    // Disable default Google UI controls — we'll add our own
    disableDefaultUI: true,
    // Re-enable just zoom controls for desktop
    zoomControl: true,
    // Gestural handling — "greedy" on mobile for one-finger pan
    gestureHandling: "greedy",
    // Click handler on the map background
    onClick: handleMapClick,
    style: { width: "100%", height: "100%" },
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["marker", "places"]}>
      <div className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
        <GoogleMap {...mapProps}>
          {/* Handles programmatic recentering triggered by the parent */}
          <MapRecenterer userLocation={userLocation} recenterRequested={recenterRequested} />

          {/* Clustered pins for all unselected restaurants */}
          <PinCluster
            restaurants={visibleRestaurants}
            onPinClick={handlePinClick}
            selectedId={selectedId ?? null}
          />

          {/* Selected pin rendered separately (with animation, above clusters) */}
          {selectedRestaurant && (
            <RestaurantPin restaurant={selectedRestaurant} isSelected onClick={handlePinClick} />
          )}

          {/* Info card floats above the selected pin */}
          {selectedRestaurant && (
            <MapPinCard
              restaurant={selectedRestaurant}
              distanceKm={
                userLocation ? haversineKm(userLocation, selectedRestaurant.location) : undefined
              }
              onTap={handleCardTap}
              onClose={handleCardClose}
            />
          )}
        </GoogleMap>

        {/* No API key warning — dev only */}
        {!MAPS_API_KEY && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
            <div className="rounded-2xl bg-card p-6 shadow-lg text-center max-w-xs mx-4">
              <p className="font-display font-semibold text-foreground mb-1">Map not configured</p>
              <p className="text-muted-foreground text-sm">
                Add{" "}
                <code className="font-mono text-xs bg-muted px-1 rounded">
                  VITE_GOOGLE_MAPS_API_KEY
                </code>{" "}
                to <code className="font-mono text-xs bg-muted px-1 rounded">apps/web/.env</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  )
}
