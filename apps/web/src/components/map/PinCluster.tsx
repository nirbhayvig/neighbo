import type { Renderer } from "@googlemaps/markerclusterer"
import { MarkerClusterer } from "@googlemaps/markerclusterer"
import type { RestaurantSummary } from "@neighbo/shared/types"
import { useMap } from "@vis.gl/react-google-maps"
import { useEffect, useRef } from "react"

interface PinClusterProps {
  restaurants: RestaurantSummary[]
  onPinClick: (id: string) => void
  selectedId: string | null
}

/**
 * Custom cluster renderer — Night Blue circle with white count text (Chillax font).
 */
const clustererRenderer: Renderer = {
  render({ count, position }) {
    const size = count < 10 ? 36 : count < 50 ? 42 : 48

    const el = document.createElement("div")
    el.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: #001E44;
      border: 2.5px solid white;
      box-shadow: 0 4px 14px rgba(0,30,68,0.35);
      cursor: pointer;
      font-family: 'Chillax', ui-sans-serif, system-ui, sans-serif;
      font-weight: 600;
      font-size: ${count < 10 ? 13 : 12}px;
      color: white;
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
      user-select: none;
    `
    el.textContent = String(count)
    el.addEventListener("mouseenter", () => {
      el.style.transform = "scale(1.12)"
    })
    el.addEventListener("mouseleave", () => {
      el.style.transform = "scale(1)"
    })

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: el,
      zIndex: 50,
    })
  },
}

/**
 * PinCluster — renders restaurant pins through @googlemaps/markerclusterer.
 *
 * We use native AdvancedMarkerElements (not React AdvancedMarker) for the
 * cluster children because MarkerClusterer manages their lifecycle directly.
 * Selected pin is excluded from clustering so it's always individually visible.
 */
export function PinCluster({ restaurants, onPinClick, selectedId }: PinClusterProps) {
  const map = useMap()
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())

  useEffect(() => {
    if (!map) return

    // Initialise clusterer once
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        renderer: clustererRenderer,
        algorithmOptions: { maxZoom: 14 },
      })
    }

    const clusterer = clustererRef.current
    const currentMarkers = markersRef.current

    // Remove markers that are no longer in the data or are now selected
    const keepIds = new Set(restaurants.filter((r) => r.id !== selectedId).map((r) => r.id))
    for (const [id, marker] of currentMarkers) {
      if (!keepIds.has(id)) {
        clusterer.removeMarker(marker)
        marker.map = null
        currentMarkers.delete(id)
      }
    }

    // Add new markers for restaurants not yet tracked (excluding selected)
    const toAdd: google.maps.marker.AdvancedMarkerElement[] = []
    for (const restaurant of restaurants) {
      if (restaurant.id === selectedId) continue
      if (currentMarkers.has(restaurant.id)) continue

      const dot = document.createElement("div")
      const color = "#5DB9FF" // Water Blue fallback — RestaurantPin handles rich color
      dot.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,30,68,0.25);
        cursor: pointer;
        transition: transform 0.15s;
      `
      dot.addEventListener("mouseenter", () => {
        dot.style.transform = "scale(1.25)"
      })
      dot.addEventListener("mouseleave", () => {
        dot.style.transform = "scale(1)"
      })

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: restaurant.location,
        content: dot,
        title: restaurant.name,
      })

      marker.addListener("click", () => onPinClick(restaurant.id))
      currentMarkers.set(restaurant.id, marker)
      toAdd.push(marker)
    }

    if (toAdd.length > 0) {
      clusterer.addMarkers(toAdd)
    }

    return () => {
      // Cleanup on unmount
      clustererRef.current?.clearMarkers()
      for (const marker of currentMarkers.values()) {
        marker.map = null
      }
    }
  }, [map, restaurants, selectedId, onPinClick])

  // The selected pin is rendered as a React AdvancedMarker (with animation)
  // separately from the cluster — see RestaurantPin.tsx. This component
  // handles all unselected pins via the native clusterer.
  return null
}
