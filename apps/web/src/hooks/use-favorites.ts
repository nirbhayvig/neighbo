import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface Favorite {
  restaurantId: string
  restaurantName: string
  restaurantCity: string
  addedAt: string
}

interface ToggleArgs {
  restaurantId: string
  isFavorited: boolean
  restaurantName: string
  restaurantCity: string
}

/**
 * Fetches the authenticated user's saved restaurants from GET /me/favorites.
 *
 * - limit: 100 — fetch a full set for client-side Set lookup in the save button
 * - staleTime: 2 min — matches nearby restaurants; keeps fish icon state fresh
 */
export function useFavorites() {
  return useQuery({
    queryKey: ["me", "favorites"],
    queryFn: async (): Promise<Favorite[]> => {
      const res = await api.me.favorites.$get({ query: { limit: "100" } })
      if (!res.ok) throw new Error("Failed to fetch favorites")
      const data = await res.json()
      return data.favorites as Favorite[]
    },
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Toggles a restaurant in/out of the user's saved list.
 *
 * Optimistically updates the cache so the fish icon flips instantly.
 * Rolls back on error and re-fetches on settle to stay in sync with the server.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ restaurantId, isFavorited }: ToggleArgs) => {
      if (isFavorited) {
        await api.me.favorites[":restaurantId"].$delete({ param: { restaurantId } })
      } else {
        const res = await api.me.favorites[":restaurantId"].$post({ param: { restaurantId } })
        if (!res.ok) throw new Error("Failed to save restaurant")
      }
    },

    onMutate: async ({ restaurantId, isFavorited, restaurantName, restaurantCity }) => {
      await queryClient.cancelQueries({ queryKey: ["me", "favorites"] })
      const prev = queryClient.getQueryData<Favorite[]>(["me", "favorites"])

      queryClient.setQueryData<Favorite[]>(["me", "favorites"], (old = []) =>
        isFavorited
          ? old.filter((f) => f.restaurantId !== restaurantId)
          : [
              ...old,
              {
                restaurantId,
                restaurantName,
                restaurantCity,
                addedAt: new Date().toISOString(),
              },
            ]
      )

      return { prev }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["me", "favorites"], ctx.prev)
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: ["me", "favorites"] }),
  })
}
