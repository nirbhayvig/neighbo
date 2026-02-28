import type { Value } from "@neighbo/shared/types"
import { Hono } from "hono"
import { db } from "../lib/firebase"
import type { AppEnv } from "../lib/types"

export const valuesRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const snapshot = await db
    .collection("values")
    .where("active", "==", true)
    .orderBy("sortOrder", "asc")
    .get()

  const values: Value[] = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      slug: doc.id,
      label: data.label,
      description: data.description,
      icon: data.icon,
      category: data.category,
      restaurantCount: data.restaurantCount,
      sortOrder: data.sortOrder,
      active: data.active,
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
    }
  })

  return c.json({ values })
})
