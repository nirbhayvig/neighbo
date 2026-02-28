import { zValidator } from "@hono/zod-validator"
import { createReportSchema } from "@neighbo/shared/schemas"
import type { Report, ReportAggregate, UserReportCheck } from "@neighbo/shared/types"
import { FieldValue } from "firebase-admin/firestore"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { db } from "../lib/firebase"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"

export const reportRoutes = new Hono<AppEnv>()
  .get("/mine", authMiddleware, async (c) => {
    const uid = c.var.user.uid
    const id = c.req.param("id")

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const snapshot = await db
      .collection("reports")
      .where("userId", "==", uid)
      .where("restaurantId", "==", id)
      .where("status", "==", "active")
      .where("createdAt", ">=", thirtyDaysAgo)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      const report = snapshot.docs[0]!.data()
      const result: UserReportCheck = {
        hasActiveReport: true,
        reportedValues: report.values,
        nextReportAllowedAt: new Date(
          report.createdAt.toDate().getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }
      return c.json(result)
    }

    const result: UserReportCheck = {
      hasActiveReport: false,
      reportedValues: [],
      nextReportAllowedAt: null,
    }
    return c.json(result)
  })
  .get("/", async (c) => {
    const id = c.req.param("id")

    const snapshot = await db
      .collection("reports")
      .where("restaurantId", "==", id)
      .where("status", "==", "active")
      .get()

    const valueCounts: Record<string, number> = {}
    let totalReports = 0

    for (const doc of snapshot.docs) {
      const data = doc.data()
      totalReports++
      for (const slug of data.values as string[]) {
        valueCounts[slug] = (valueCounts[slug] ?? 0) + 1
      }
    }

    const result: ReportAggregate = { valueCounts, totalReports }
    return c.json(result)
  })
  .post("/", authMiddleware, zValidator("json", createReportSchema), async (c) => {
    const uid = c.var.user.uid
    const id = c.req.param("id")
    const body = c.req.valid("json")

    // Verify restaurant exists and is not deleted
    const restaurantDoc = await db
      .collection("restaurants")
      .doc(id as string)
      .get()
    if (!restaurantDoc.exists || restaurantDoc.data()?.deletedAt != null) {
      throw new HTTPException(404, { message: "Restaurant not found" })
    }
    const restaurantData = restaurantDoc.data()!

    // Rate-limit check: one report per 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const existingSnapshot = await db
      .collection("reports")
      .where("userId", "==", uid)
      .where("restaurantId", "==", id)
      .where("status", "==", "active")
      .where("createdAt", ">=", thirtyDaysAgo)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      const existingReport = existingSnapshot.docs[0]!.data()
      const nextReportAllowedAt = new Date(
        existingReport.createdAt.toDate().getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString()
      return c.json({ error: "Too many requests", nextReportAllowedAt }, 429)
    }

    // Create report doc ref before transaction to get the ID
    const reportRef = db.collection("reports").doc()
    const restaurantRef = db.collection("restaurants").doc(id as string)
    const userRef = db.collection("users").doc(uid)

    await db.runTransaction(async (transaction) => {
      // Read current restaurant doc inside transaction
      const restaurantSnap = await transaction.get(restaurantRef)
      const currentRestaurantData = restaurantSnap.data()!

      // Build updated values array — increment reportCount and promote certTier if needed
      const currentValues: Array<{
        slug: string
        label: string
        certTier: number
        selfAttested: boolean
        reportCount: number
        verifiedAt: string | null
      }> = currentRestaurantData.values ?? []

      const updatedValues = currentValues.map((v) => {
        if (body.values.includes(v.slug)) {
          const newReportCount = (v.reportCount ?? 0) + 1
          const newCertTier = newReportCount >= 3 && v.certTier < 2 ? 2 : v.certTier
          return { ...v, reportCount: newReportCount, certTier: newCertTier }
        }
        return v
      })

      const newCertTierMax = Math.max(0, ...updatedValues.map((v) => v.certTier))
      const newTotalReportCount = (currentRestaurantData.totalReportCount ?? 0) + 1

      // Create the report doc
      transaction.set(reportRef, {
        restaurantId: id,
        restaurantName: restaurantData.name,
        userId: uid,
        values: body.values,
        comment: body.comment ?? null,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
      })

      // Update restaurant doc
      transaction.update(restaurantRef, {
        values: updatedValues,
        totalReportCount: newTotalReportCount,
        certTierMax: newCertTierMax,
      })

      // Increment user reportCount
      transaction.update(userRef, {
        reportCount: FieldValue.increment(1),
      })
    })

    // Fetch the created report doc to get resolved timestamps
    const createdReportDoc = await reportRef.get()
    const createdData = createdReportDoc.data()!

    const createdAt: FirebaseFirestore.Timestamp = createdData.createdAt
    const report: Report = {
      id: reportRef.id,
      restaurantId: createdData.restaurantId,
      restaurantName: createdData.restaurantName,
      userId: createdData.userId,
      values: createdData.values,
      comment: createdData.comment,
      status: createdData.status,
      createdAt: createdAt.toDate().toISOString(),
    }

    const nextReportAllowedAt = new Date(
      createdAt.toDate().getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    return c.json({ ...report, nextReportAllowedAt })
  })
