import { createFactory } from "hono/factory"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import type { AppEnv } from "./lib/types"
import { authMiddleware } from "./middleware/auth"
import { health } from "./routes/health"

/**
 * createFactory<AppEnv>() pins the Env type once across all handlers/middleware
 * so Variables are typed correctly everywhere without repetition.
 */
const factory = createFactory<AppEnv>()

/**
 * All registrations are chained so that AppType captures the full route
 * shape — required for Hono RPC type inference on the frontend.
 *
 * Rule: never break the chain with separate app.use() / app.route() statements.
 */
const app = factory
  .createApp()
  .use(logger())
  .use(
    "*",
    cors({
      origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
      credentials: true,
    })
  )
  .route("/health", health)
  // Protected: auth guard is applied per-route, not globally, so public routes
  // above remain accessible without a token.
  .get("/me", authMiddleware, (c) => {
    const user = c.var.user
    return c.json({ uid: user.uid, email: user.email })
  })

export { app }

// AppType is the single export consumed by the frontend Hono RPC client.
// Importing it as a type-only import ensures zero runtime cost.
export type AppType = typeof app
