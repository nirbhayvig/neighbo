import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"

export const businessRoutes = new Hono<AppEnv>().get("/my-restaurant", authMiddleware, (c) =>
  c.json({ restaurant: null })
)
