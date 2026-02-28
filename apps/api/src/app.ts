import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import type { AppEnv } from "./lib/types"
import { businessRoutes } from "./routes/business"
import { health } from "./routes/health"
import { meRoutes } from "./routes/me"
import { restaurantRoutes } from "./routes/restaurants"
import { valuesRoutes } from "./routes/values"

const app = new Hono<AppEnv>()
  .use(logger())
  .use(
    "*",
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  )
  .route("/health", health)
  .route("/me", meRoutes)
  .route("/restaurants", restaurantRoutes)
  .route("/values", valuesRoutes)
  .route("/business", businessRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: "Internal server error" }, 500)
})

export { app }
export type AppType = typeof app
