import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { auth } from "../lib/firebase"
import type { AppEnv } from "../lib/types"

/**
 * Firebase ID token verification middleware.
 * Extracts the Bearer token from the Authorization header, verifies it with
 * firebase-admin, and sets the decoded token as c.var.user for downstream handlers.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing or invalid Authorization header" })
  }

  const idToken = authHeader.slice(7)

  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    c.set("user", decodedToken)
    await next()
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired token" })
  }
})
