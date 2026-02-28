import { zValidator } from "@hono/zod-validator"
import { createClaimSchema } from "@neighbo/shared/schemas"
import type { BusinessClaim } from "@neighbo/shared/types"
import { FieldValue } from "firebase-admin/firestore"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { db } from "../lib/firebase"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"
import { requireOwnership } from "../middleware/ownership"

function toBusinessClaim(doc: FirebaseFirestore.DocumentSnapshot): BusinessClaim {
  const data = doc.data()!
  return {
    id: doc.id,
    restaurantId: data.restaurantId,
    restaurantName: data.restaurantName,
    userId: data.userId,
    userEmail: data.userEmail,
    ownerName: data.ownerName,
    role: data.role,
    phone: data.phone,
    email: data.email,
    evidenceDescription: data.evidenceDescription ?? null,
    evidenceFileURLs: data.evidenceFileURLs ?? [],
    status: data.status,
    createdAt: data.createdAt?.toDate?.()
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString(),
  }
}

export const claimRoutes = new Hono<AppEnv>()
  .post("/claim", authMiddleware, zValidator("json", createClaimSchema), async (c) => {
    const id = c.req.param("id") ?? ""
    const body = c.req.valid("json")
    const { uid } = c.var.user

    // Verify restaurant exists
    const restaurantDoc = await db.collection("restaurants").doc(id).get()
    if (!restaurantDoc.exists || restaurantDoc.data()?.deletedAt != null) {
      throw new HTTPException(404, { message: "Restaurant not found" })
    }

    const restaurantData = restaurantDoc.data()!

    // Check restaurant is not already approved-claimed
    if (restaurantData.claimStatus === "approved") {
      throw new HTTPException(409, { message: "Restaurant is already claimed" })
    }

    // Check user does not already own another restaurant
    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()
    if (userData?.claimedRestaurantId && userData.claimedRestaurantId !== id) {
      throw new HTTPException(409, { message: "You already own a restaurant" })
    }

    // Check for existing pending claim from this user for this restaurant (idempotent)
    const existingClaimSnap = await db
      .collection("businessClaims")
      .where("restaurantId", "==", id)
      .where("userId", "==", uid)
      .where("status", "==", "pending")
      .limit(1)
      .get()

    if (!existingClaimSnap.empty) {
      const existingDoc = existingClaimSnap.docs[0]!
      return c.json(toBusinessClaim(existingDoc))
    }

    // Create the claim doc ref before the transaction
    const claimRef = db.collection("businessClaims").doc()
    const restaurantRef = db.collection("restaurants").doc(id)

    await db.runTransaction(async (txn) => {
      txn.set(claimRef, {
        restaurantId: id,
        restaurantName: restaurantData.name,
        userId: uid,
        userEmail: c.var.user.email ?? "",
        ownerName: body.ownerName,
        role: body.role,
        phone: body.phone,
        email: body.email,
        evidenceDescription: body.evidenceDescription ?? null,
        evidenceFileURLs: [],
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      })

      txn.update(restaurantRef, {
        claimedByUserId: uid,
        claimStatus: "pending",
      })
    })

    const createdDoc = await claimRef.get()
    return c.json(toBusinessClaim(createdDoc), 201)
  })
  .get("/claim", authMiddleware, requireOwnership, async (c) => {
    const id = c.req.param("id") ?? ""
    const { uid } = c.var.user

    const snap = await db
      .collection("businessClaims")
      .where("restaurantId", "==", id)
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()

    if (snap.empty) {
      throw new HTTPException(404, { message: "Claim not found" })
    }

    return c.json(toBusinessClaim(snap.docs[0]!))
  })
