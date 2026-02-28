import type { DecodedIdToken } from "firebase-admin/auth"
import type { Context, Next } from "hono"
import { HTTPException } from "hono/http-exception"
import { auth } from "../lib/firebase"

export type AuthVariables = {
  user: DecodedIdToken
}

export async function authMiddleware(c: Context, next: Next) {
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
}
