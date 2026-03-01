import type { RestaurantSummary } from "@neighbo/shared/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

interface Location {
  lat: number
  lng: number
}

/**
 * Fetches restaurants near the given location from the real API.
 *
 * - radius: 10 km — wide enough for a city, tight enough to stay relevant
 * - limit: 100 — fetch a full set so client-side value filtering is instant
 * - staleTime: 2 min — no re-fetch if the user hasn't moved far
 * - placeholderData: keeps the previous pin set visible during re-fetches
 *   (e.g., when geolocation updates after the initial fallback center)
 */
export function useNearbyRestaurants(location: Location | null) {
  return useQuery({
    queryKey: ["restaurants", "nearby", location?.lat, location?.lng],
    queryFn: async (): Promise<RestaurantSummary[]> => {
      if (!location) throw new Error("location required")
      const res = await api.restaurants.nearby.$get({
        query: {
          lat: String(location.lat),
          lng: String(location.lng),
          radius: "10",
          limit: "100",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch nearby restaurants")
      const data = await res.json()
      return data.restaurants
    },
    enabled: location !== null,
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  })
}
