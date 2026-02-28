import { zValidator } from "@hono/zod-validator"
import { createReportSchema } from "@neighbo/shared/schemas"
import type { Report } from "@neighbo/shared/types"
import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"

const STUB_REPORT: Report = {
  id: "stub-report-id",
  restaurantId: "stub-restaurant-id",
  restaurantName: "Stub Restaurant",
  userId: "stub-uid",
  values: ["lgbtq-friendly"],
  comment: null,
  status: "active",
  createdAt: new Date().toISOString(),
}

export const reportRoutes = new Hono<AppEnv>()
  .get("/mine", authMiddleware, (c) =>
    c.json({
      hasActiveReport: false,
      reportedValues: [],
      nextReportAllowedAt: null,
    })
  )
  .get("/", (c) => c.json({ valueCounts: {}, totalReports: 0 }))
  .post("/", authMiddleware, zValidator("json", createReportSchema), (c) => c.json(STUB_REPORT))
