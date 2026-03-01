import type { Value } from "@neighbo/shared/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

/**
 * Fetches the full list of active values from the API.
 *
 * - staleTime: 30 min — values almost never change in production
 * - Returns an empty array while loading so the filter tray renders immediately
 *   (chips appear once data arrives; the initial flash is imperceptible on fast connections)
 * - No placeholder fallback needed: the values endpoint is a fast, single-collection read
 */
export function useValues() {
  return useQuery({
    queryKey: ["values"],
    queryFn: async (): Promise<Value[]> => {
      const res = await api.values.$get()
      if (!res.ok) throw new Error("Failed to fetch values")
      const data = await res.json()
      return data.values
    },
    staleTime: 1000 * 60 * 30,
  })
}
