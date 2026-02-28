import { zValidator } from "@hono/zod-validator"
import {
  createRestaurantSchema,
  nearbyQuerySchema,
  restaurantListQuerySchema,
  updateRestaurantSchema,
} from "@neighbo/shared/schemas"
import type { Restaurant, RestaurantSummary, RestaurantValue } from "@neighbo/shared/types"
import { FieldValue } from "firebase-admin/firestore"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { db } from "../lib/firebase"
import { computeGeohash, getGeohashBounds, haversineDistance } from "../lib/geo"
import { decodeCursor, encodeCursor } from "../lib/pagination"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"
import { requireOwnership } from "../middleware/ownership"
import { claimRoutes } from "./business-claims"
import { certificationRoutes } from "./certification"
import { reportRoutes } from "./reports"

function toRestaurant(doc: FirebaseFirestore.DocumentSnapshot): Restaurant {
  const data = doc.data()!
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()
      ? data.updatedAt.toDate().toISOString()
      : new Date().toISOString(),
    deletedAt: data.deletedAt?.toDate?.() ? data.deletedAt.toDate().toISOString() : null,
  } as Restaurant
}

function toRestaurantSummary(
  doc: FirebaseFirestore.DocumentSnapshot,
  distanceKm?: number
): RestaurantSummary {
  const data = doc.data()!
  const summary: RestaurantSummary = {
    id: doc.id,
    googlePlaceId: data.googlePlaceId,
    name: data.name,
    city: data.city,
    values: data.values ?? [],
    certTierMax: data.certTierMax ?? 0,
    location: data.location,
  }
  if (distanceKm !== undefined) {
    summary.distanceKm = distanceKm
  }
  return summary
}

export const restaurantRoutes = new Hono<AppEnv>()
  .get("/nearby", zValidator("query", nearbyQuerySchema), async (c) => {
    const { lat, lng, radius, values: valuesParam, limit } = c.req.valid("query")

    const bounds = getGeohashBounds(lat, lng, radius)

    const querySnapshots = await Promise.all(
      bounds.map(([startHash, endHash]) =>
        db
          .collection("restaurants")
          .where("deletedAt", "==", null)
          .orderBy("geohash")
          .startAt(startHash)
          .endAt(endHash)
          .get()
      )
    )

    // Merge and deduplicate by doc ID
    const docMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    for (const snapshot of querySnapshots) {
      for (const doc of snapshot.docs) {
        docMap.set(doc.id, doc)
      }
    }

    // Compute distances and filter
    let results: RestaurantSummary[] = []
    for (const doc of docMap.values()) {
      const data = doc.data()
      const docLat = data.location?.lat
      const docLng = data.location?.lng
      if (typeof docLat !== "number" || typeof docLng !== "number") continue
      const distanceKm = haversineDistance(lat, lng, docLat, docLng)
      if (distanceKm > radius) continue
      results.push(toRestaurantSummary(doc, distanceKm))
    }

    // Filter by values (AND semantics)
    if (valuesParam) {
      const requiredSlugs = valuesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      if (requiredSlugs.length > 0) {
        results = results.filter((r) => {
          const slugSet = new Set(r.values.map((v) => v.slug))
          return requiredSlugs.every((s) => slugSet.has(s))
        })
      }
    }

    // Sort by distance ascending and apply limit
    results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    results = results.slice(0, limit)

    return c.json({ restaurants: results })
  })
  .get("/", zValidator("query", restaurantListQuerySchema), async (c) => {
    const { q, values: valuesParam, city, certTier, sort, cursor, limit } = c.req.valid("query")

    let query: FirebaseFirestore.Query = db.collection("restaurants").where("deletedAt", "==", null)

    if (city) {
      query = query.where("city", "==", city)
    }

    if (certTier !== undefined) {
      query = query.where("certTierMax", ">=", certTier)
    }

    let valueSlugs: string[] = []
    if (valuesParam) {
      valueSlugs = valuesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      if (valueSlugs.length > 0) {
        query = query.where("valueSlugs", "array-contains", valueSlugs[0])
      }
    }

    if (sort === "name") {
      query = query.orderBy("name")
    } else if (sort === "certTier") {
      query = query.orderBy("certTierMax", "desc")
    }
    // "distance" sort is done post-query

    if (cursor) {
      const lastDocId = decodeCursor(cursor)
      if (lastDocId) {
        const cursorDoc = await db.collection("restaurants").doc(lastDocId).get()
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc)
        }
      }
    }

    const snapshot = await query.limit(limit + 1).get()
    let docs = snapshot.docs

    // Post-query filtering: additional value slugs beyond the first
    const extraSlugs = valueSlugs.slice(1)
    if (extraSlugs.length > 0) {
      docs = docs.filter((doc) => {
        const data = doc.data()
        const slugSet = new Set<string>(data.valueSlugs ?? [])
        return extraSlugs.every((s) => slugSet.has(s))
      })
    }

    // Post-query filtering: search query
    if (q) {
      const lowerQ = q.toLowerCase()
      docs = docs.filter((doc) => {
        const data = doc.data()
        return typeof data.name === "string" && data.name.toLowerCase().includes(lowerQ)
      })
    }

    const hasMore = docs.length > limit
    const trimmed = hasMore ? docs.slice(0, limit) : docs

    const lastTrimmed = trimmed.at(-1)
    const nextCursor = hasMore && lastTrimmed ? encodeCursor(lastTrimmed.id) : null

    const restaurants: RestaurantSummary[] = trimmed.map((doc) => toRestaurantSummary(doc))

    return c.json({ restaurants, nextCursor })
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const doc = await db.collection("restaurants").doc(id).get()

    if (!doc.exists || doc.data()?.deletedAt != null) {
      throw new HTTPException(404, { message: "Restaurant not found" })
    }

    const data = doc.data()!
    const valueSlugs: string[] = data.valueSlugs ?? []

    // Batch-fetch value labels
    const valueDocs = await Promise.all(
      valueSlugs.map((slug) => db.collection("values").doc(slug).get())
    )

    const labelMap = new Map<string, string>()
    for (const vDoc of valueDocs) {
      if (vDoc.exists) {
        labelMap.set(vDoc.id, vDoc.data()?.label ?? vDoc.id)
      }
    }

    // Merge labels into existing values array
    const existingValues: RestaurantValue[] = data.values ?? []
    const existingBySlug = new Map(existingValues.map((v) => [v.slug, v]))

    const values: RestaurantValue[] = valueSlugs.map((slug) => {
      const existing = existingBySlug.get(slug)
      return {
        slug,
        label: labelMap.get(slug) ?? slug,
        certTier: existing?.certTier ?? 0,
        selfAttested: existing?.selfAttested ?? false,
        reportCount: existing?.reportCount ?? 0,
        verifiedAt: existing?.verifiedAt ?? null,
      }
    })

    const restaurant = toRestaurant(doc)
    restaurant.values = values

    return c.json(restaurant)
  })
  .post("/", authMiddleware, zValidator("json", createRestaurantSchema), async (c) => {
    const body = c.req.valid("json")
    const { googlePlaceId, name, city, location, values: valueSlugsInput } = body

    // Check googlePlaceId uniqueness
    const existingSnap = await db
      .collection("restaurants")
      .where("googlePlaceId", "==", googlePlaceId)
      .where("deletedAt", "==", null)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      throw new HTTPException(409, {
        message: "A restaurant with this Google Place ID already exists",
      })
    }

    // Fetch and validate value slugs
    const valueDocs = await Promise.all(
      valueSlugsInput.map((slug) => db.collection("values").doc(slug).get())
    )

    for (let i = 0; i < valueDocs.length; i++) {
      const vDoc = valueDocs[i]
      const slug = valueSlugsInput[i]
      if (vDoc && !vDoc.exists) {
        throw new HTTPException(400, {
          message: `Value slug "${slug}" does not exist`,
        })
      }
    }

    const valuesArray: RestaurantValue[] = valueSlugsInput.map((slug, i) => {
      const vDoc = valueDocs[i]
      return {
        slug,
        label: vDoc?.data()?.label ?? slug,
        certTier: 0,
        selfAttested: false as const,
        reportCount: 0,
        verifiedAt: null,
      }
    })

    const geohash = computeGeohash(location.lat, location.lng)

    const newDocRef = db.collection("restaurants").doc()

    const docData = {
      googlePlaceId,
      name,
      city,
      location,
      geohash,
      values: valuesArray,
      valueSlugs: valueSlugsInput,
      certTierMax: 0,
      totalReportCount: 0,
      claimedByUserId: null,
      claimStatus: null,
      deletedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await newDocRef.set(docData)

    // Batch increment restaurantCount on each value doc
    const batch = db.batch()
    for (const slug of valueSlugsInput) {
      const valueRef = db.collection("values").doc(slug)
      batch.update(valueRef, { restaurantCount: FieldValue.increment(1) })
    }
    await batch.commit()

    // Re-fetch and return
    const createdDoc = await newDocRef.get()
    return c.json(toRestaurant(createdDoc), 201)
  })
  .patch(
    "/:id",
    authMiddleware,
    requireOwnership,
    zValidator("json", updateRestaurantSchema),
    async (c) => {
      const id = c.req.param("id")
      const body = c.req.valid("json")

      const doc = await db.collection("restaurants").doc(id).get()
      if (!doc.exists || doc.data()?.deletedAt != null) {
        throw new HTTPException(404, { message: "Restaurant not found" })
      }

      const data = doc.data()!
      const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (body.values !== undefined) {
        const newSlugs = body.values

        // Fetch labels from values collection
        const valueDocs = await Promise.all(
          newSlugs.map((slug) => db.collection("values").doc(slug).get())
        )

        const existingValues: RestaurantValue[] = data.values ?? []
        const existingBySlug = new Map(existingValues.map((v) => [v.slug, v]))

        const newValuesArray: RestaurantValue[] = newSlugs.map((slug, i) => {
          const existing = existingBySlug.get(slug)
          const vDoc = valueDocs[i]
          const label = vDoc?.exists ? (vDoc.data()?.label ?? slug) : slug
          if (existing) {
            return {
              slug,
              label,
              certTier: existing.certTier,
              selfAttested: existing.selfAttested,
              reportCount: existing.reportCount,
              verifiedAt: existing.verifiedAt,
            }
          }
          return {
            slug,
            label,
            certTier: 0,
            selfAttested: false,
            reportCount: 0,
            verifiedAt: null,
          }
        })

        const certTierMax = Math.max(0, ...newValuesArray.map((v) => v.certTier))

        updateData.values = newValuesArray
        updateData.valueSlugs = newSlugs
        updateData.certTierMax = certTierMax
      }

      await db.collection("restaurants").doc(id).update(updateData)

      const updatedDoc = await db.collection("restaurants").doc(id).get()
      return c.json(toRestaurant(updatedDoc))
    }
  )
  .delete("/:id", authMiddleware, async (c) => {
    const id = c.req.param("id")
    await db.collection("restaurants").doc(id).update({
      deletedAt: FieldValue.serverTimestamp(),
    })
    return new Response(null, { status: 204 })
  })
  .route("/:id/reports", reportRoutes)
  .route("/:id/certification", certificationRoutes)
  .route("/:id", claimRoutes)
