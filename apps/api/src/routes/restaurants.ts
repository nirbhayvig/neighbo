import { zValidator } from "@hono/zod-validator"
import { createRestaurantSchema, updateRestaurantSchema } from "@neighbo/shared/schemas"
import type { Restaurant } from "@neighbo/shared/types"
import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"
import { requireOwnership } from "../middleware/ownership"
import { claimRoutes } from "./business-claims"
import { certificationRoutes } from "./certification"
import { reportRoutes } from "./reports"

const STUB_RESTAURANT: Restaurant = {
  id: "stub-id",
  googlePlaceId: "ChIJ_stub",
  name: "Stub Restaurant",
  city: "Minneapolis",
  values: [],
  certTierMax: 1,
  location: { lat: 44.97, lng: -93.26 },
  totalReportCount: 0,
  claimedByUserId: null,
  claimStatus: null,
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const restaurantRoutes = new Hono<AppEnv>()
  .get("/nearby", (c) => c.json({ restaurants: [] }))
  .get("/", (c) => c.json({ restaurants: [STUB_RESTAURANT], nextCursor: null }))
  .get("/:id", (c) => c.json(STUB_RESTAURANT))
  .post("/", authMiddleware, zValidator("json", createRestaurantSchema), (c) =>
    c.json(STUB_RESTAURANT, 201)
  )
  .patch(
    "/:id",
    authMiddleware,
    requireOwnership,
    zValidator("json", updateRestaurantSchema),
    (c) => c.json(STUB_RESTAURANT)
  )
  .delete("/:id", authMiddleware, (_c) => new Response(null, { status: 204 }))
  .route("/:id/reports", reportRoutes)
  .route("/:id/certification", certificationRoutes)
  .route("/:id", claimRoutes)
