import type { User } from "@neighbo/shared/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

/**
 * Fetches the authenticated user's Neighbo profile from GET /me.
 *
 * - Auto-creates the Firestore user doc on first sign-in (API handles this)
 * - staleTime: 5 min — profile data rarely changes mid-session
 * - Returns undefined while loading; callers should handle gracefully
 */
export function useUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<User> => {
      const res = await api.me.$get()
      if (!res.ok) throw new Error("Failed to fetch user profile")
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}
