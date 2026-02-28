import { zValidator } from "@hono/zod-validator"
import { selfAttestSchema, uploadEvidenceSchema } from "@neighbo/shared/schemas"
import type { Certification, CertificationValue, CertTier } from "@neighbo/shared/types"
import { FieldValue } from "firebase-admin/firestore"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { db } from "../lib/firebase"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"
import { requireOwnership } from "../middleware/ownership"

type StoredValue = {
  slug: string
  certTier: number
  selfAttested: boolean
  reportCount: number
  verifiedAt: string | null
}

async function buildCertificationValues(
  storedValues: StoredValue[]
): Promise<CertificationValue[]> {
  const valueDocs = await Promise.all(
    storedValues.map((v) => db.collection("values").doc(v.slug).get())
  )

  const labelMap = new Map<string, string>()
  for (const vDoc of valueDocs) {
    if (vDoc.exists) {
      const label: string = vDoc.data()?.label ?? vDoc.id
      labelMap.set(vDoc.id, label)
    }
  }

  return storedValues.map((v) => ({
    slug: v.slug,
    label: labelMap.get(v.slug) ?? v.slug,
    certTier: (v.certTier >= 1 ? v.certTier : 1) as CertTier,
    selfAttested: v.selfAttested,
    reportCount: v.reportCount,
    verifiedAt: v.verifiedAt,
  }))
}

export const certificationRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const id = c.req.param("id") ?? ""
    const doc = await db.collection("restaurants").doc(id).get()

    if (!doc.exists || doc.data()?.deletedAt != null) {
      throw new HTTPException(404, { message: "Restaurant not found" })
    }

    const restaurantData = doc.data()!
    const storedValues: StoredValue[] = restaurantData.values ?? []

    const certificationValues = await buildCertificationValues(storedValues)

    const certification: Certification = {
      restaurantId: id,
      values: certificationValues,
      certTierMax: Math.max(1, ...certificationValues.map((v) => v.certTier)) as CertTier,
      totalReportCount: restaurantData.totalReportCount ?? 0,
    }

    return c.json(certification)
  })
  .post(
    "/self-attest",
    authMiddleware,
    requireOwnership,
    zValidator("json", selfAttestSchema),
    async (c) => {
      const id = c.req.param("id") ?? ""
      const body = c.req.valid("json")

      const restaurantRef = db.collection("restaurants").doc(id)

      await db.runTransaction(async (transaction) => {
        const restaurantDoc = await transaction.get(restaurantRef)

        if (!restaurantDoc.exists || restaurantDoc.data()?.deletedAt != null) {
          throw new HTTPException(404, { message: "Restaurant not found" })
        }

        const data = restaurantDoc.data()!
        const existingValues: StoredValue[] = data.values ?? []

        const existingBySlug = new Map(existingValues.map((v) => [v.slug, v]))

        // Fetch labels for new slugs inside the transaction
        const newSlugs = body.values.filter((slug) => !existingBySlug.has(slug))
        const newSlugDocs = await Promise.all(
          newSlugs.map((slug) => transaction.get(db.collection("values").doc(slug)))
        )
        const newSlugLabelMap = new Map<string, string>()
        for (const vDoc of newSlugDocs) {
          if (vDoc.exists) {
            const label: string = vDoc.data()?.label ?? vDoc.id
            newSlugLabelMap.set(vDoc.id, label)
          }
        }

        // Build updated values array — stored without label field
        const updatedValues: StoredValue[] = [...existingValues]
        for (const slug of body.values) {
          const existing = existingBySlug.get(slug)
          if (existing) {
            // Update existing: set selfAttested true, ensure certTier >= 1
            const idx = updatedValues.findIndex((v) => v.slug === slug)
            if (idx !== -1) {
              updatedValues[idx] = {
                slug: existing.slug,
                certTier: existing.certTier < 1 ? 1 : existing.certTier,
                selfAttested: true,
                reportCount: existing.reportCount,
                verifiedAt: existing.verifiedAt,
              }
            }
          } else {
            // Append new value (label is not stored in the values array on restaurant)
            updatedValues.push({
              slug,
              certTier: 1,
              selfAttested: true,
              reportCount: 0,
              verifiedAt: null,
            })
          }
        }

        const valueSlugs = updatedValues.map((v) => v.slug)
        const certTierMax = Math.max(1, ...updatedValues.map((v) => v.certTier))

        transaction.update(restaurantRef, {
          values: updatedValues,
          valueSlugs,
          certTierMax,
          updatedAt: FieldValue.serverTimestamp(),
        })
      })

      // After transaction, fetch updated restaurant to build response
      const updatedDoc = await restaurantRef.get()
      const updatedData = updatedDoc.data()!

      const storedValues: StoredValue[] = updatedData.values ?? []
      const certificationValues = await buildCertificationValues(storedValues)

      const certification: Certification = {
        restaurantId: id,
        values: certificationValues,
        certTierMax: Math.max(1, ...certificationValues.map((v) => v.certTier)) as CertTier,
        totalReportCount: updatedData.totalReportCount ?? 0,
      }

      return c.json(certification)
    }
  )
  .post(
    "/upload-evidence",
    authMiddleware,
    requireOwnership,
    zValidator("json", uploadEvidenceSchema),
    async (c) => {
      const id = c.req.param("id") ?? ""
      const body = c.req.valid("json")
      const uid = c.var.user.uid

      const evidenceRef = db.collection("restaurants").doc(id).collection("evidenceUploads").doc()

      await evidenceRef.set({
        valueSlug: body.valueSlug,
        fileURLs: body.fileURLs,
        description: body.description ?? null,
        submittedByUid: uid,
        createdAt: FieldValue.serverTimestamp(),
      })

      return c.json({ success: true, message: "Evidence submitted for review" })
    }
  )
