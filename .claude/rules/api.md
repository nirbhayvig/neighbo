---
paths: apps/api/src/**
---

# API Rules — `apps/api`

Rules for the Hono.js backend API. This API is consumed exclusively by `apps/web` via type-safe RPC — every design decision here has a direct impact on the frontend.

## Backend-Frontend Type Contract

<required>
`apps/api/src/app.ts` MUST export `AppType`. The frontend imports this type to get fully type-safe API calls with zero code duplication. Every new route added here automatically becomes type-safe on the frontend.
</required>

```typescript
// apps/api/src/app.ts — ALWAYS export AppType
const app = new Hono<AppEnv>()
  .route("/health", healthRoute)

export type AppType = typeof app  // ← frontend imports this
export default app
```

- Never change the shape of a response without updating consuming `useQuery` calls in `apps/web`
- Route paths must stay consistent — the frontend Vite proxy maps `/api/*` → `localhost:3001`

## Route Patterns

Each feature gets its own file in `apps/api/src/routes/`, registered in `app.ts` via `.route()`.

```typescript
import { Hono } from "hono"
import type { AppEnv } from "../lib/types"

const myRoute = new Hono<AppEnv>()

myRoute.get("/", async (c) => {
  const user = c.var.user  // Firebase DecodedIdToken (set by auth middleware)
  return c.json({ ... })
})

export default myRoute
```

## Zod Validation

<required>
Use `@hono/zod-validator` for ALL request validation — never trust unvalidated input.
</required>

```typescript
import { zValidator } from "@hono/zod-validator"
import { createUserSchema } from "@neighbo/shared/schemas"

myRoute.post("/", zValidator("json", createUserSchema), async (c) => {
  const body = c.req.valid("json")  // fully typed
  return c.json({ ... })
})
```

## Authentication

- Auth middleware: `apps/api/src/middleware/auth.ts`
- Verifies Firebase ID tokens from `Authorization: Bearer <token>` header
- After middleware runs, `c.var.user` is a Firebase `DecodedIdToken`
- Apply auth middleware to any route that requires a logged-in user

<examples>
<good>
```typescript
import { authMiddleware } from "../middleware/auth"
myRoute.use("*", authMiddleware)  // protected
publicRoute.get("/health", (c) => c.json({ ok: true }))  // public
```
</good>
</examples>

## Shared Schemas

<required>
ALWAYS import Zod schemas from `@neighbo/shared/schemas` — never redeclare schemas that already exist in the shared package.
</required>

<examples>
<good>
```typescript
import { userSchema, createUserSchema } from "@neighbo/shared/schemas"
```
</good>
<bad>
```typescript
// Do not duplicate schemas already in @neighbo/shared
const userSchema = z.object({ ... })
```
</bad>
</examples>

## AppEnv Type

All Hono instances must be typed with `AppEnv` from `apps/api/src/lib/types.ts`:

```typescript
import type { AppEnv } from "../lib/types"
const app = new Hono<AppEnv>()
```

`AppEnv` makes `c.var.user` typed as `DecodedIdToken` throughout the app.

## Firebase Admin SDK

- Initialized once in `apps/api/src/lib/firebase.ts`
- Exports: `auth` (Firebase Admin Auth), `firestore` (Firestore instance)
- Import from there — never re-initialize Firebase Admin

## Neighbo Domain Rules

When implementing Neighbo features, keep these business rules in mind:

- **Certification tiers** — Tier 1 (self-attested), Tier 2 (3+ community reports), Tier 3 (moderator-verified). Tier changes must be logged with a timestamp.
- **Community reports** — one report per user per restaurant per month (enforce at API level)
- **Analytics data** — all analytics must be aggregated and anonymized; never expose raw user-level data
- **Values filtering** — filter logic uses AND semantics (restaurant must match ALL selected values)

## Reference Files
- App entry + AppType: `apps/api/src/app.ts`
- Auth middleware: `apps/api/src/middleware/auth.ts`
- Firebase admin: `apps/api/src/lib/firebase.ts`
- AppEnv type: `apps/api/src/lib/types.ts`
- Example route: `apps/api/src/routes/health.ts`
