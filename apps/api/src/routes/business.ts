import type { Restaurant } from "@neighbo/shared/types"
import { Hono } from "hono"
import { db } from "../lib/firebase"
import type { AppEnv } from "../lib/types"
import { authMiddleware } from "../middleware/auth"

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

export const businessRoutes = new Hono<AppEnv>().get(
  "/my-restaurant",
  authMiddleware,
  async (c) => {
    const { uid } = c.var.user

    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const claimedRestaurantId = userData?.claimedRestaurantId

    if (!claimedRestaurantId) {
      return c.json({ restaurant: null })
    }

    const restaurantDoc = await db.collection("restaurants").doc(claimedRestaurantId).get()

    if (!restaurantDoc.exists || restaurantDoc.data()?.deletedAt != null) {
      return c.json({ restaurant: null })
    }

    return c.json({ restaurant: toRestaurant(restaurantDoc) })
  }
)
