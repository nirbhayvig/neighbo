import { zValidator } from "@hono/zod-validator"
import { updateUserSchema } from "@neighbo/shared/schemas"
import type { User } from "@neighbo/shared/types"
import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"

const STUB_USER: User = {
  uid: "stub-uid",
  email: "stub@example.com",
  displayName: "Stub User",
  photoURL: null,
  userType: "user",
  valuePreferences: [],
  claimedRestaurantId: null,
  reportCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const meRoutes = new Hono<AppEnv>()
  .get("/", authMiddleware, (c) => c.json(STUB_USER))
  .patch("/", authMiddleware, zValidator("json", updateUserSchema), (c) => c.json(STUB_USER))
  .get("/favorites", authMiddleware, (c) => c.json({ favorites: [], nextCursor: null }))
  .post("/favorites/:restaurantId", authMiddleware, (c) => c.json({ success: true }))
  .delete("/favorites/:restaurantId", authMiddleware, (_c) => new Response(null, { status: 204 }))
  .get("/reports", authMiddleware, (c) => c.json({ reports: [], nextCursor: null }))
