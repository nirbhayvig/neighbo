import { zValidator } from "@hono/zod-validator"
import { updateUserSchema } from "@neighbo/shared/schemas"
import type { User } from "@neighbo/shared/types"
import { FieldValue } from "firebase-admin/firestore"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { db } from "../lib/firebase"
import { decodeCursor, encodeCursor } from "../lib/pagination"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"

function toUser(doc: FirebaseFirestore.DocumentSnapshot): User {
  const data = doc.data()!
  return {
    ...data,
    uid: doc.id,
    createdAt: data.createdAt?.toDate?.()
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()
      ? data.updatedAt.toDate().toISOString()
      : new Date().toISOString(),
  } as User
}

export const meRoutes = new Hono<AppEnv>()
  .get("/", authMiddleware, async (c) => {
    const { uid } = c.var.user
    const userRef = db.collection("users").doc(uid)
    let userDoc = await userRef.get()

    if (!userDoc.exists) {
      await userRef.set({
        uid: c.var.user.uid,
        email: c.var.user.email ?? "",
        displayName: c.var.user.name ?? null,
        photoURL: c.var.user.picture ?? null,
        userType: "user",
        valuePreferences: [],
        claimedRestaurantId: null,
        reportCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      userDoc = await userRef.get()
    }

    return c.json(toUser(userDoc))
  })
  .patch("/", authMiddleware, zValidator("json", updateUserSchema), async (c) => {
    const { uid } = c.var.user
    const body = c.req.valid("json")
    const userRef = db.collection("users").doc(uid)

    const update: Record<string, unknown> = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await userRef.set(update, { merge: true })
    const userDoc = await userRef.get()

    return c.json(toUser(userDoc))
  })
  .get("/favorites", authMiddleware, async (c) => {
    const { uid } = c.var.user
    const cursor = c.req.query("cursor")
    const limitParam = c.req.query("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    const favoritesRef = db
      .collection("users")
      .doc(uid)
      .collection("favorites")
      .orderBy("addedAt", "desc")

    let query: FirebaseFirestore.Query = favoritesRef

    if (cursor) {
      const cursorDocId = decodeCursor(cursor)
      if (cursorDocId) {
        const cursorDoc = await db
          .collection("users")
          .doc(uid)
          .collection("favorites")
          .doc(cursorDocId)
          .get()
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc)
        }
      }
    }

    const snapshot = await query.limit(limit + 1).get()
    const docs = snapshot.docs

    let nextCursor: string | null = null
    if (docs.length > limit) {
      docs.pop()
      const lastDoc = docs[docs.length - 1]
      nextCursor = lastDoc ? encodeCursor(lastDoc.id) : null
    }

    const favorites = docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        addedAt: data.addedAt?.toDate?.()
          ? data.addedAt.toDate().toISOString()
          : new Date().toISOString(),
      }
    })

    return c.json({ favorites, nextCursor })
  })
  .post("/favorites/:restaurantId", authMiddleware, async (c) => {
    const { uid } = c.var.user
    const { restaurantId } = c.req.param()

    const restaurantDoc = await db.collection("restaurants").doc(restaurantId).get()

    if (!restaurantDoc.exists || restaurantDoc.data()?.deletedAt != null) {
      throw new HTTPException(404, { message: "Restaurant not found" })
    }

    const restaurantData = restaurantDoc.data()!

    await db.collection("users").doc(uid).collection("favorites").doc(restaurantId).set({
      restaurantId,
      restaurantName: restaurantData.name,
      restaurantCity: restaurantData.city,
      addedAt: FieldValue.serverTimestamp(),
    })

    return c.json({ success: true })
  })
  .delete("/favorites/:restaurantId", authMiddleware, async (c) => {
    const { uid } = c.var.user
    const { restaurantId } = c.req.param()

    await db.collection("users").doc(uid).collection("favorites").doc(restaurantId).delete()

    return new Response(null, { status: 204 })
  })
  .get("/reports", authMiddleware, async (c) => {
    const { uid } = c.var.user
    const cursor = c.req.query("cursor")
    const limitParam = c.req.query("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    const reportsRef = db
      .collection("reports")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")

    let query: FirebaseFirestore.Query = reportsRef

    if (cursor) {
      const cursorDocId = decodeCursor(cursor)
      if (cursorDocId) {
        const cursorDoc = await db.collection("reports").doc(cursorDocId).get()
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc)
        }
      }
    }

    const snapshot = await query.limit(limit + 1).get()
    const docs = snapshot.docs

    let nextCursor: string | null = null
    if (docs.length > limit) {
      docs.pop()
      const lastDoc = docs[docs.length - 1]
      nextCursor = lastDoc ? encodeCursor(lastDoc.id) : null
    }

    const reports = docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()
          ? data.updatedAt.toDate().toISOString()
          : new Date().toISOString(),
      }
    })

    return c.json({ reports, nextCursor })
  })
