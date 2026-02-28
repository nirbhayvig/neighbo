import type { MockRestaurant } from "./data/restaurants"
import { MOCK_RESTAURANTS } from "./data/restaurants"
import { VALUES } from "./data/values"

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true"

// ─── Types matching the real API response shapes ─────────────────────────────

export type { MockRestaurant }

// ─── Mock handlers ────────────────────────────────────────────────────────────

export function mockGetRestaurants(filters?: { values?: string[]; q?: string }): {
  restaurants: MockRestaurant[]
  nextCursor: null
} {
  let results = [...MOCK_RESTAURANTS]

  if (filters?.values?.length) {
    results = results.filter((r) =>
      filters.values!.every((slug) => r.values.some((v) => v.slug === slug))
    )
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase()
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.neighborhood.toLowerCase().includes(q)
    )
  }

  return { restaurants: results, nextCursor: null }
}

export function mockGetRestaurant(id: string): MockRestaurant | undefined {
  return MOCK_RESTAURANTS.find((r) => r.id === id)
}

export function mockGetValues() {
  return { values: VALUES }
}

export { MOCK_RESTAURANTS, VALUES }
