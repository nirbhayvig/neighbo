import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { db } from "../lib/firebase"
import type { AppEnv } from "../lib/types"

export const requireOwnership = createMiddleware<AppEnv>(async (c, next) => {
  const restaurantId = c.req.param("id")
  const userDoc = await db.collection("users").doc(c.var.user.uid).get()
  const data = userDoc.data()
  if (!data || data.claimedRestaurantId !== restaurantId) {
    throw new HTTPException(403, { message: "Not the owner of this restaurant" })
  }
  await next()
})
