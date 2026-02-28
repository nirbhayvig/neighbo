import { hc } from "hono/client"
import type { AppType } from "@neighbo/api"
import { getIdToken } from "./auth"

/**
 * Type-safe Hono RPC client.
 * All requests are proxied through Vite's /api -> localhost:3001 in dev,
 * and should point to your deployed API URL in production.
 *
 * Usage: api.health.$get() — fully typed, with autocomplete.
 */
export const api = hc<AppType>("/api", {
  headers: async (): Promise<Record<string, string>> => {
    const token = await getIdToken()
    if (token) return { Authorization: `Bearer ${token}` }
    return {}
  },
})
