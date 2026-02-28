import { zValidator } from "@hono/zod-validator"
import { createClaimSchema } from "@neighbo/shared/schemas"
import type { BusinessClaim } from "@neighbo/shared/types"
import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"
import { requireOwnership } from "../middleware/ownership"

const STUB_CLAIM: BusinessClaim = {
  id: "stub-claim-id",
  restaurantId: "stub-restaurant-id",
  restaurantName: "Stub Restaurant",
  userId: "stub-uid",
  userEmail: "stub@example.com",
  ownerName: "Stub Owner",
  role: "owner",
  phone: "555-0100",
  email: "owner@stub.com",
  evidenceDescription: null,
  evidenceFileURLs: [],
  status: "pending",
  createdAt: new Date().toISOString(),
}

export const claimRoutes = new Hono<AppEnv>()
  .post("/claim", authMiddleware, zValidator("json", createClaimSchema), (c) => c.json(STUB_CLAIM))
  .get("/claim", authMiddleware, requireOwnership, (c) => c.json(STUB_CLAIM))
