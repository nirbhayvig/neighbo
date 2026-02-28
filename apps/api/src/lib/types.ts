import type { DecodedIdToken } from "firebase-admin/auth"

/**
 * Shared Hono Env type used across the app, middleware, and route handlers.
 * Defined once here to avoid repeating it everywhere.
 */
export type AppEnv = {
  Variables: {
    user: DecodedIdToken
  }
}
