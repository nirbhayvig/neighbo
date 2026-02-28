import { zValidator } from "@hono/zod-validator"
import { selfAttestSchema, uploadEvidenceSchema } from "@neighbo/shared/schemas"
import type { Certification } from "@neighbo/shared/types"
import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"
import { requireOwnership } from "../middleware/ownership"

const STUB_CERTIFICATION: Certification = {
  restaurantId: "stub-restaurant-id",
  values: [],
  certTierMax: 1,
  totalReportCount: 0,
}

export const certificationRoutes = new Hono<AppEnv>()
  .get("/", (c) => c.json(STUB_CERTIFICATION))
  .post(
    "/self-attest",
    authMiddleware,
    requireOwnership,
    zValidator("json", selfAttestSchema),
    (c) => c.json(STUB_CERTIFICATION)
  )
  .post(
    "/upload-evidence",
    authMiddleware,
    requireOwnership,
    zValidator("json", uploadEvidenceSchema),
    (c) => c.json({ success: true, message: "Evidence submitted for review" })
  )
