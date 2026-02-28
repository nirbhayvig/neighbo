import type { DecodedIdToken } from "firebase-admin/auth"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { authMiddleware } from "./middleware/auth"
import { health } from "./routes/health"

type Variables = {
  user: DecodedIdToken
}

const app = new Hono<{ Variables: Variables }>()

// Global middleware
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    credentials: true,
  })
)

// Public routes
app.route("/health", health)

// Protected routes (add authMiddleware per-route or per-router as needed)
app.get("/me", authMiddleware, (c) => {
  const user = c.get("user")
  return c.json({ uid: user.uid, email: user.email })
})

export { app }

// Export the type for Hono RPC client inference
export type AppType = typeof app
