# Neighbo API — Agent Orchestration Plan

**Date:** 2026-02-28
**Depends on:** `docs/api/implementation-plan.md`

This document instructs a manager agent on how to spawn and coordinate subagents to implement the full Neighbo API. Each phase is described with agents, their assignments, parallelism constraints, and validation criteria. All agents must read `docs/api/implementation-plan.md` as their primary reference.

---

## Parallelism Overview

```
Phase 0 ────────────────────────────── [2 agents, PARALLEL]
  A: Shared package (types + schemas)
  B: API utilities + middleware

         │ (Phase 1 depends on Phase 0-A only)
         ▼

Phase 1 ────────────────────────────── [1 agent, depends on Phase 0-A]
  SCAFFOLDING: all stub routes + app.ts wiring
  ⚑ Frontend is unblocked after this phase completes

         │
         ▼

Phase 2 ────────────────────────────── [3 agents, PARALLEL, depends on Phase 1]
  A: me.ts (replace stub with full implementation)
  B: values.ts (replace stub with full implementation)
  C: restaurants.ts (replace stub with full implementation)

         │
         ▼

Phase 3 ────────────────────────────── [3 agents, PARALLEL, depends on Phase 2]
  A: reports.ts (replace stub)
  B: certification.ts (replace stub)
  C: business-claims.ts + business.ts (replace stubs)

         │
         ▼

Phase 4 ────────────────────────────── [1 agent, depends on Phase 3]
  A: firestore.indexes.json + final validation
```

**Total agents across all phases:** 10
**Max agents at once:** 3 (Phases 2 and 3)

---

## Pre-requisite: Install Dependency

Before spawning any agents, the manager agent must run:

```bash
cd /Users/nirbhayvig/Repositories/Misc/neighbo/apps/api && bun add geofire-common
```

Verify it appears in `apps/api/package.json` under `dependencies`.

---

## Phase 0 — Foundation [2 agents, PARALLEL]

**Run both agents simultaneously. Phase 1 cannot start until Phase 0-A completes (Phase 0-B can finish concurrently with Phase 1).**

---

### Phase 0-A: Shared Package Update

**Agent count:** 1
**Isolation:** worktree (to avoid conflicts with Phase 0-B)

**Task:**
Rewrite and extend `packages/shared/src/` to match the Neighbo data model. The current shared package has generic user types that must be replaced.

**Files to create/modify:**

1. **`packages/shared/src/types/user.ts`** — rewrite:
   ```typescript
   export type UserType = "user" | "business"
   export type User = {
     uid: string; email: string; displayName: string | null
     photoURL: string | null; userType: UserType
     valuePreferences: string[]; claimedRestaurantId: string | null
     reportCount: number; createdAt: string; updatedAt: string
   }
   ```

2. **`packages/shared/src/schemas/user.ts`** — rewrite:
   ```typescript
   export const userTypeSchema = z.enum(["user", "business"])
   export const updateUserSchema = z.object({
     displayName: z.string().min(1).max(100).optional(),
     photoURL: z.string().url().nullable().optional(),
     valuePreferences: z.array(z.string()).optional(),
   })
   export type UpdateUserInput = z.infer<typeof updateUserSchema>
   ```

3. **`packages/shared/src/types/restaurant.ts`** — NEW (see §4.3 of implementation-plan.md)

4. **`packages/shared/src/schemas/restaurant.ts`** — NEW (see §4.4 of implementation-plan.md)

5. **`packages/shared/src/types/value.ts`** — NEW (see §4.5 of implementation-plan.md)

6. **`packages/shared/src/types/report.ts`** — NEW (see §4.6 of implementation-plan.md)

7. **`packages/shared/src/schemas/report.ts`** — NEW (see §4.7 of implementation-plan.md)

8. **`packages/shared/src/types/certification.ts`** — NEW (see §4.8 of implementation-plan.md)

9. **`packages/shared/src/schemas/certification.ts`** — NEW (see §4.9 of implementation-plan.md)

10. **`packages/shared/src/types/business.ts`** — NEW (see §4.10 of implementation-plan.md)

11. **`packages/shared/src/schemas/business.ts`** — NEW (see §4.11 of implementation-plan.md)

12. **`packages/shared/src/schemas/index.ts`** — update barrel to export all new schema files

13. **`packages/shared/src/types/index.ts`** — update barrel to export all new type files

14. **`packages/shared/src/index.ts`** — update main barrel to re-export everything from schemas and types

**Validation:**
```bash
cd /Users/nirbhayvig/Repositories/Misc/neighbo
bun run typecheck --filter @neighbo/shared
```
Must pass with 0 errors.

**Review criteria:**
- All types are derived via `z.infer<>` — no manual type duplication
- `UserRole` / old generic types are completely removed
- All export paths (`./schemas`, `./types`, `.`) work correctly

---

### Phase 0-B: API Utilities + Middleware

**Agent count:** 1
**Isolation:** worktree (to avoid conflicts with Phase 1-A)

**Note:** These files do NOT import from `@neighbo/shared`. They only depend on `firebase-admin`, `hono`, and `geofire-common`. Phase 0-B can run concurrently with Phase 1 (scaffolding).

**Files to create:**

1. **`apps/api/src/lib/geo.ts`**
   ```typescript
   import { geohashForPoint, geohashQueryBounds, distanceBetween } from "geofire-common"

   export function computeGeohash(lat: number, lng: number): string {
     return geohashForPoint([lat, lng])
   }

   // radiusKm in kilometers, returns pairs of [startHash, endHash]
   export function getGeohashBounds(lat: number, lng: number, radiusKm: number): Array<[string, string]> {
     return geohashQueryBounds([lat, lng], radiusKm * 1000)
   }

   // Returns distance in kilometers
   export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
     return distanceBetween([lat1, lng1], [lat2, lng2])
   }
   ```

2. **`apps/api/src/lib/pagination.ts`**
   ```typescript
   export function encodeCursor(lastDocId: string): string {
     return Buffer.from(JSON.stringify({ lastDocId })).toString("base64url")
   }

   export function decodeCursor(cursor: string): string | null {
     try {
       const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
       return typeof decoded.lastDocId === "string" ? decoded.lastDocId : null
     } catch {
       return null
     }
   }
   ```

3. **`apps/api/src/middleware/ownership.ts`**
   ```typescript
   import { createMiddleware } from "hono/factory"
   import { HTTPException } from "hono/http-exception"
   import type { AppEnv } from "../lib/types"
   import { db } from "../lib/firebase"

   export const requireOwnership = createMiddleware<AppEnv>(async (c, next) => {
     const restaurantId = c.req.param("id")
     const userDoc = await db.collection("users").doc(c.var.user.uid).get()
     if (userDoc.data()?.claimedRestaurantId !== restaurantId) {
       throw new HTTPException(403, { message: "Not the owner of this restaurant" })
     }
     await next()
   })
   ```

**Validation:**
```bash
cd /Users/nirbhayvig/Repositories/Misc/neighbo
bun run typecheck --filter @neighbo/api
```
Expect errors from missing route files — that is OK. Only check that the 3 new files themselves typecheck cleanly (no errors in geo.ts, pagination.ts, ownership.ts).

**Review criteria:**
- `computeGeohash` uses precision appropriate for geo queries (geofire-common defaults are fine)
- `decodeCursor` never throws — always returns `null` on invalid input
- `requireOwnership` throws 403 (not 401) for wrong owner

---

## Phase 1 — Scaffolding [1 agent, depends on Phase 0-A]

**Depends on:** Phase 0-A complete (shared package must be published/linked before stubs can import from `@neighbo/shared`).**After this phase, the frontend is unblocked.** Phase 0-B (utilities) can run concurrently with this phase.

**Agent count:** 1

**Task:** Create all route files as typed stubs and wire them into `app.ts`. Every route is defined with the correct HTTP method, path, auth middleware, and Zod validator, but returns mock data instead of querying Firestore. The goal is a fully-typed `AppType` export that the frontend can import immediately.

**Files to create:**

1. **`apps/api/src/routes/me.ts`** — all 6 endpoints as stubs
   - `GET /` → mock User object (with all fields from `User` type)
   - `PATCH /` → validate with `updateUserSchema`, return mock User
   - `GET /favorites` → `{ favorites: [], nextCursor: null }`
   - `POST /favorites/:restaurantId` → `{ success: true }`
   - `DELETE /favorites/:restaurantId` → `new Response(null, { status: 204 })`
   - `GET /reports` → `{ reports: [], nextCursor: null }`

2. **`apps/api/src/routes/values.ts`** — 1 endpoint
   - `GET /` → `{ values: [] }`

3. **`apps/api/src/routes/restaurants.ts`** — 6 endpoints + sub-route mounts
   - `GET /nearby` → `{ restaurants: [] }`
   - `GET /` → `{ restaurants: [STUB_RESTAURANT], nextCursor: null }`
   - `GET /:id` → `STUB_RESTAURANT`
   - `POST /` → validate with `createRestaurantSchema`, return `STUB_RESTAURANT` (201)
   - `PATCH /:id` → validate with `updateRestaurantSchema`, return `STUB_RESTAURANT`
   - `DELETE /:id` → 204
   - `.route("/:id/reports", reportRoutes)`
   - `.route("/:id/certification", certificationRoutes)`
   - `.route("/:id", claimRoutes)`

4. **`apps/api/src/routes/reports.ts`** — 3 endpoints
   - `GET /mine` → `{ hasActiveReport: false, reportedValues: [], nextReportAllowedAt: null }` (**register before `GET /`**)
   - `GET /` → `{ valueCounts: {}, totalReports: 0 }`
   - `POST /` → validate with `createReportSchema`, return mock Report

5. **`apps/api/src/routes/certification.ts`** — 3 endpoints
   - `GET /` → mock Certification object
   - `POST /self-attest` → validate with `selfAttestSchema`, return mock Certification
   - `POST /upload-evidence` → validate with `uploadEvidenceSchema`, return `{ success: true, message: "Evidence submitted for review" }`

6. **`apps/api/src/routes/business-claims.ts`** — 2 endpoints (mounted at `/:id` in restaurants)
   - `POST /claim` → validate with `createClaimSchema`, return mock BusinessClaim
   - `GET /claim` → return mock BusinessClaim

7. **`apps/api/src/routes/business.ts`** — 1 endpoint
   - `GET /my-restaurant` → `{ restaurant: null }`

8. **`apps/api/src/app.ts`** — update to mount all new routes and add global error handler:
   ```typescript
   import { Hono } from "hono"
   import { logger } from "hono/logger"
   import { cors } from "hono/cors"
   import { HTTPException } from "hono/http-exception"
   import { healthRoutes } from "./routes/health"
   import { meRoutes } from "./routes/me"
   import { restaurantRoutes } from "./routes/restaurants"
   import { valuesRoutes } from "./routes/values"
   import { businessRoutes } from "./routes/business"
   import type { AppEnv } from "./lib/types"

   const app = new Hono<AppEnv>()
     .use(logger())
     .use("*", cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }))
     .route("/health", healthRoutes)
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

   export type AppType = typeof app
   export default app
   ```

**Validation:**
```bash
cd /Users/nirbhayvig/Repositories/Misc/neighbo
bun run typecheck
```
Must pass with 0 errors across all packages.

**Review criteria:**
- Every route from `docs/api-features-overview.md §4` is registered
- Auth middleware applied to all routes that require it
- Zod validators applied to all routes that accept a request body or query params
- `/restaurants/nearby` registered before `/restaurants/:id`
- `/restaurants/:id/reports/mine` registered before `/restaurants/:id/reports`
- `AppType` chain is unbroken in `app.ts`
- `bun run typecheck` exits 0 — frontend team can now import `AppType`

---

## Phase 2 — Route Implementations [3 agents, PARALLEL]

**Depends on:** Phase 1 (scaffolding) AND Phase 0-B (utilities) both complete.
**Run all 3 agents simultaneously. Phase 3 cannot start until ALL complete.**
**Each agent REPLACES a stub file with a full Firestore implementation. Do NOT modify `restaurants.ts` in Phase 2-A or 2-B.**

---

### Phase 2-A: User Profile Routes (`me.ts`)

**Agent count:** 1

**File to replace:** `apps/api/src/routes/me.ts` (stub → full implementation)

Replace the stub with full Firestore logic. The route structure (methods, paths, validators, auth) is already correct — only the handler bodies change.

**Endpoints to implement:**

1. **`GET /`** (`/me`)
   - Apply `authMiddleware`
   - Read `users/{uid}` from Firestore
   - If doc does not exist, CREATE it:
     ```typescript
     {
       uid: c.var.user.uid,
       email: c.var.user.email ?? "",
       displayName: c.var.user.name ?? null,
       photoURL: c.var.user.picture ?? null,
       userType: "user",
       valuePreferences: [],
       claimedRestaurantId: null,
       reportCount: 0,
       createdAt: FieldValue.serverTimestamp(),
       updatedAt: FieldValue.serverTimestamp(),
     }
     ```
   - Return the full User object. Convert Firestore Timestamps to ISO strings.

2. **`PATCH /`** (`/me`)
   - Apply `authMiddleware`
   - Validate body with `updateUserSchema` (from `@neighbo/shared/schemas`)
   - Build partial update with only provided fields + `updatedAt: FieldValue.serverTimestamp()`
   - Merge-update `users/{uid}` using `.set(data, { merge: true })`
   - Fetch and return updated doc

3. **`GET /favorites`** (`/me/favorites`)
   - Apply `authMiddleware`
   - Validate `?cursor` and `?limit` query params
   - Query `users/{uid}/favorites` ordered by `addedAt DESC` with limit
   - If `cursor` provided, decode it and use `.startAfter(lastDoc)`
   - Return `{ favorites: [...], nextCursor: string | null }`

4. **`POST /favorites/:restaurantId`** (`/me/favorites/:restaurantId`)
   - Apply `authMiddleware`
   - Fetch `restaurants/{restaurantId}` — throw 404 if not found or deleted
   - Write to `users/{uid}/favorites/{restaurantId}`:
     ```typescript
     { restaurantId, restaurantName: restaurantDoc.name, restaurantCity: restaurantDoc.city, addedAt: FieldValue.serverTimestamp() }
     ```
   - Use `.set()` (idempotent)
   - Return 200 `{ success: true }`

5. **`DELETE /favorites/:restaurantId`** (`/me/favorites/:restaurantId`)
   - Apply `authMiddleware`
   - Delete `users/{uid}/favorites/{restaurantId}`
   - Return 204 (no body, idempotent)

6. **`GET /reports`** (`/me/reports`)
   - Apply `authMiddleware`
   - Validate `?cursor` and `?limit` query params
   - Query `reports` collection where `userId == uid` ordered by `createdAt DESC`
   - Apply cursor pagination
   - Return `{ reports: [...], nextCursor: string | null }`

**Important:** Import `encodeCursor` and `decodeCursor` from `../lib/pagination`. Import `db` from `../lib/firebase`. Import types from `@neighbo/shared/types`.

**Validation:**
```bash
cd /Users/nirbhayvig/Repositories/Misc/neighbo
bun run typecheck --filter @neighbo/api 2>&1 | grep "routes/me"
```
No errors in me.ts.

**Review criteria:**
- Response shape for `GET /` matches `api-features-overview.md §4.2` exactly
- Upsert on first call is confirmed (check doc creation logic)
- 204 response for DELETE has no body
- Timestamps are serialized as ISO strings (not raw Firestore Timestamps)

---

### Phase 2-B: Values Route (`values.ts`)

**Agent count:** 1

**File to replace:** `apps/api/src/routes/values.ts` (stub → full implementation)

**Endpoints to implement:**

1. **`GET /`** (`/values`)
   - No auth required
   - Query `values` collection where `active == true` ordered by `sortOrder ASC`
   - Return `{ values: [...Value] }`
   - Map Firestore Timestamps to ISO strings

**Validation:**
```bash
bun run typecheck --filter @neighbo/api 2>&1 | grep "routes/values"
```

**Review criteria:**
- Response matches `api-features-overview.md §4.4` exactly (all 11 value fields in example response)
- Only active values returned
- Sorted by `sortOrder`

---

### Phase 2-C: Restaurants Core Routes (`restaurants.ts`)

**Agent count:** 1

**File to replace:** `apps/api/src/routes/restaurants.ts` (stub → full implementation)

This is the most complex route file. The sub-route imports (`reportRoutes`, `certificationRoutes`, `claimRoutes`) and `.route()` mounts already exist in the stub — do NOT remove them. Only replace the handler bodies for the 6 core restaurant endpoints.

**CRITICAL — Route Order:** `GET /nearby` is already before `GET /:id` in the stub — preserve this order.

**Do NOT modify:** The sub-route `.route()` calls at the bottom (`/:id/reports`, `/:id/certification`, `/:id`). Phase 3 agents own those files.

**Endpoints to implement (replace stub handlers):**

1. **`GET /nearby`**
   - Public, no auth
   - Validate query with `nearbyQuerySchema`
   - Use `getGeohashBounds(lat, lng, radius)` from `../lib/geo`
   - Execute parallel Firestore queries for each geohash range:
     ```typescript
     // Filter: deletedAt == null, orderBy geohash, startAt/endAt hash bounds
     ```
   - Merge results, deduplicate by doc ID
   - Compute `distanceKm` for each result via `haversineDistance`
   - Filter to exact radius (remove results where `distanceKm > radius`)
   - If `?values` provided, filter remaining results by value slugs (in-memory)
   - Sort by `distanceKm ASC`, apply `limit`
   - Return `{ restaurants: [...RestaurantSummary & { distanceKm }] }`

2. **`GET /`**
   - Public, no auth
   - Validate query with `restaurantListQuerySchema`
   - Build Firestore query with `.where("deletedAt", "==", null)`
   - Apply filters:
     - `?city` → `.where("city", "==", city)`
     - `?certTier` → `.where("certTierMax", ">=", certTier)`
     - `?values` (first slug only) → `.where("valueSlugs", "array-contains", firstSlug)`
   - Apply sort: `name` → `.orderBy("name")`, `certTier` → `.orderBy("certTierMax", "desc")`
   - Apply cursor pagination (decode cursor → startAfter)
   - Fetch up to `limit + 1` docs (to detect next page)
   - Post-query filter: remaining value slugs, `?q` name filter
   - Return `{ restaurants: [...], nextCursor: string | null }`

3. **`GET /:id`**
   - Public
   - Fetch `restaurants/{id}`, throw 404 if not found or `deletedAt != null`
   - Batch-fetch value labels from `values` collection for each slug
   - Merge labels into `values` array
   - Return full Restaurant object (all fields per `api-features-overview.md §4.3`)

4. **`POST /`**
   - Requires `authMiddleware`
   - Validate body with `createRestaurantSchema`
   - Check `googlePlaceId` uniqueness: query `restaurants` where `googlePlaceId == id`, `deletedAt == null`, limit 1 → 409 if found
   - Fetch and validate each value slug from `values` collection
   - Compute geohash from `location` via `computeGeohash`
   - Build document and write to `restaurants` with auto-generated ID
   - Batch-increment `restaurantCount` on each `values/{slug}` doc
   - Return created restaurant

5. **`PATCH /:id`**
   - Requires `authMiddleware` + `requireOwnership`
   - Validate body with `updateRestaurantSchema`
   - If `values` provided: fetch labels, rebuild `values` array (preserve existing `certTier`/`reportCount` for existing slugs)
   - Recalculate `certTierMax` as `Math.max(...values.map(v => v.certTier))`
   - Update `valueSlugs` denormalized array
   - Write update with `updatedAt: FieldValue.serverTimestamp()`
   - Return updated restaurant

6. **`DELETE /:id`**
   - Requires `authMiddleware`
   - Set `deletedAt: FieldValue.serverTimestamp()` on `restaurants/{id}`
   - Return 204

**Sub-route mounting (add at end of route chain):**
```typescript
.route("/:id/reports", reportRoutes)
.route("/:id/certification", certificationRoutes)
.route("/:id", claimRoutes)
```

**Validation:**
```bash
bun run typecheck --filter @neighbo/api 2>&1 | grep "routes/restaurants"
```

**Review criteria:**
- `/nearby` registered before `/:id`
- Response shapes match `api-features-overview.md §4.3` exactly
- `googlePlaceId` uniqueness check in POST
- Geohash computed and stored on restaurant creation
- `valueSlugs` kept in sync with `values` array on all writes

---

## Phase 3 — Sub-Route Implementations [3 agents, PARALLEL]

**Depends on:** Phase 2-C complete.
**Run all 3 agents simultaneously. Phase 4 cannot start until ALL complete.**

Each agent replaces a stub with a full Firestore implementation. The `.route()` calls in `restaurants.ts` already wire these in — agents must NOT modify `restaurants.ts`.

---

### Phase 3-A: Community Reports (`reports.ts`)

**Agent count:** 1

**File to replace:** `apps/api/src/routes/reports.ts` (stub → full implementation)

This route is mounted at `/:id/reports` inside `restaurants.ts`. The `:id` param is the restaurant ID, accessible via `c.req.param("id")`.

**Endpoints to implement:**

1. **`GET /`** (→ `GET /restaurants/:id/reports`)
   - Public
   - Query `reports` where `restaurantId == id` and `status == "active"`
   - Aggregate: iterate all matching docs, accumulate `valueCounts: Record<string, number>`
   - Return `{ valueCounts, totalReports: number }` — NO individual userId exposed

2. **`POST /`** (→ `POST /restaurants/:id/reports`)
   - Requires `authMiddleware`
   - Validate body with `createReportSchema`
   - Verify restaurant exists (fetch `restaurants/{id}`, throw 404 if missing/deleted)
   - Rate-limit check:
     ```typescript
     const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
     // Query reports where userId==uid, restaurantId==id, createdAt >= thirtyDaysAgo, status=="active", limit 1
     ```
     If found, throw 429 with body: `{ error: "Too many requests", nextReportAllowedAt: existingReport.createdAt + 30 days }`
   - Use Firestore TRANSACTION to:
     1. Create report doc in `reports` collection: `{ restaurantId, restaurantName, userId: uid, values, comment, status: "active", createdAt: serverTimestamp() }`
     2. Increment `totalReportCount` on `restaurants/{id}` by 1
     3. For each reported value slug, increment `values[idx].reportCount` in restaurant doc
     4. If any value's new `reportCount >= 3` and current `certTier < 2`, promote that value to `certTier: 2`
     5. Recalculate `certTierMax` on restaurant
     6. Increment `reportCount` on `users/{uid}` by 1
   - Return created report + `nextReportAllowedAt` (createdAt + 30 days)

3. **`GET /mine`** (→ `GET /restaurants/:id/reports/mine`)
   - Requires `authMiddleware`
   - **CRITICAL:** Register this BEFORE `GET /` or structure so Hono matches `/mine` correctly (use literal path)
   - Query same rate-limit window as POST
   - Return: `{ hasActiveReport: boolean, reportedValues: string[], nextReportAllowedAt: string | null }`

**Validation:**
```bash
bun run typecheck --filter @neighbo/api 2>&1 | grep "routes/reports"
```

**Review criteria:**
- `GET /` response matches `api-features-overview.md §4.6` exactly — no UIDs in response
- 429 response includes `nextReportAllowedAt` timestamp
- Transaction covers ALL counter increments atomically
- Tier 2 auto-promotion happens inside the transaction
- `GET /mine` registered before generic patterns

---

### Phase 3-B: Certification Routes (`certification.ts`)

**Agent count:** 1

**File to replace:** `apps/api/src/routes/certification.ts` (stub → full implementation)

Mounted at `/:id/certification` inside `restaurants.ts`.

**Endpoints to implement:**

1. **`GET /`** (→ `GET /restaurants/:id/certification`)
   - Public
   - Fetch `restaurants/{id}`, throw 404 if missing/deleted
   - Batch-fetch value labels from `values` collection
   - Return `Certification` object: `{ restaurantId, values: CertificationValue[], certTierMax, totalReportCount }`

2. **`POST /self-attest`** (→ `POST /restaurants/:id/certification/self-attest`)
   - Requires `authMiddleware` + `requireOwnership`
   - Validate body with `selfAttestSchema`
   - Fetch current restaurant doc (transaction read)
   - For each slug in body.values:
     - If slug already in `restaurant.values`, update: `selfAttested: true`, ensure `certTier >= 1`
     - If new slug, append: `{ slug, certTier: 1, selfAttested: true, reportCount: 0, verifiedAt: null }`
   - Rebuild `valueSlugs` array
   - Recalculate `certTierMax`
   - Update restaurant doc with `updatedAt`
   - Return updated `Certification` object

3. **`POST /upload-evidence`** (→ `POST /restaurants/:id/certification/upload-evidence`)
   - Requires `authMiddleware` + `requireOwnership`
   - Validate body with `uploadEvidenceSchema`
   - Write to `restaurants/{id}/evidenceUploads/{autoId}` subcollection:
     ```typescript
     { valueSlug, fileURLs, description, submittedByUid: uid, createdAt: serverTimestamp() }
     ```
   - Return `{ success: true, message: "Evidence submitted for review" }`

**Validation:**
```bash
bun run typecheck --filter @neighbo/api 2>&1 | grep "routes/certification"
```

**Review criteria:**
- `GET /` response matches `api-features-overview.md §4.5`
- Self-attest is idempotent (re-attesting same value is a no-op)
- `requireOwnership` applied to all mutating routes

---

### Phase 3-C: Business Claim Routes (`business-claims.ts` + `business.ts`)

**Agent count:** 1

**Files to replace:**
- `apps/api/src/routes/business-claims.ts` (stub → full implementation) — claim routes mounted inside restaurants
- `apps/api/src/routes/business.ts` (stub → full implementation) — top-level `/business` routes

**`business-claims.ts`** — mounted at `/:id` inside restaurants:

1. **`POST /claim`** (→ `POST /restaurants/:id/claim`)
   - Requires `authMiddleware`
   - Validate body with `createClaimSchema`
   - Verify restaurant exists (throw 404)
   - Check restaurant is not already approved-claimed (throw 409 if `claimStatus == "approved"`)
   - Check user does not already own another restaurant (read `users/{uid}.claimedRestaurantId`, throw 409 if set)
   - Check for existing pending claim from this user for this restaurant (return existing if found — idempotent)
   - Use Firestore TRANSACTION:
     1. Create `businessClaims` doc: `{ restaurantId, restaurantName, userId: uid, userEmail, ownerName, role, phone, email, evidenceDescription, evidenceFileURLs: [], status: "pending", createdAt: serverTimestamp() }`
     2. Update `restaurants/{id}`: `{ claimedByUserId: uid, claimStatus: "pending" }`
   - Return created claim

2. **`GET /claim`** (→ `GET /restaurants/:id/claim`)
   - Requires `authMiddleware` + `requireOwnership`
   - Query `businessClaims` where `restaurantId == id` and `userId == uid` ordered by `createdAt DESC` limit 1
   - Return claim document

**`business.ts`** — top-level routes, mounted at `/business` in `app.ts`:

3. **`GET /my-restaurant`** (→ `GET /business/my-restaurant`)
   - Requires `authMiddleware`
   - Read `users/{uid}` → get `claimedRestaurantId`
   - If null, return `{ restaurant: null }`
   - Fetch `restaurants/{claimedRestaurantId}`, throw 404 if missing
   - Return full restaurant document

**Validation:**
```bash
bun run typecheck --filter @neighbo/api 2>&1 | grep -E "routes/business"
```

**Review criteria:**
- Claim idempotency (returning existing pending claim, not creating duplicate)
- Transaction atomicity for claim creation
- `GET /my-restaurant` returns `{ restaurant: null }` (not 404) when no restaurant claimed

---

## Phase 4 — Final Validation [1 agent]

**Depends on:** Phase 3 complete (ALL sub-route files fully implemented).

**Agent count:** 1

**Task:** `app.ts` and all routes are already wired (done in Phase 1 scaffolding). This phase creates `firestore.indexes.json` and validates the full API typechecks cleanly with no lint issues.

**`firestore.indexes.json`** — create at `/Users/nirbhayvig/Repositories/Misc/neighbo/firestore.indexes.json` with all 8 composite indexes as specified in `docs/api/implementation-plan.md §13`.

**Validation steps (run in order):**
```bash
# 1. Typecheck entire monorepo
cd /Users/nirbhayvig/Repositories/Misc/neighbo
bun run typecheck

# 2. Lint + format check
bunx biome check .

# 3. Auto-fix any lint/format issues
bunx biome check --write .

# 4. Re-run typecheck to confirm still clean
bun run typecheck
```

**Review criteria:**
- `bun run typecheck` exits with 0 errors across all packages
- `AppType` chain is unbroken — every `.route()` call returns a typed Hono instance
- Global error handler properly catches `HTTPException`
- `firestore.indexes.json` includes all 8 required composite indexes
- No `any` types introduced (Biome will warn)

---

## Handoff Notes for Manager Agent

1. **Frontend unblocking:** Phase 1 (scaffolding) is the critical milestone. Once `bun run typecheck` passes after Phase 1, hand off `AppType` access to the frontend team — they can begin building pages immediately with full type safety.

2. **Merge strategy:** Phases 0, 1, 2, and 3 use worktrees where needed. After each phase's agents complete, merge their changes back to the working branch before starting the next phase.

3. **Stub replacement:** Phase 2 and Phase 3 agents REPLACE stub files, not append to them. Communicate this explicitly. The route structure (methods, paths, validators, auth) must not change — only handler bodies are rewritten.

4. **Conflict risk:** `restaurants.ts` is created in Phase 1 (scaffolding) and replaced in Phase 2-C. Phase 3 agents must NOT touch it. Communicate this constraint explicitly to Phase 3 agents.

5. **Phase 0-B concurrency:** Phase 0-B (utilities: `geo.ts`, `pagination.ts`, `ownership.ts`) does not depend on the shared package and can run concurrently with Phase 1 (scaffolding). The manager may overlap these to save time.

6. **Type errors between phases:** Phase 1 and Phase 2 agents import from `@neighbo/shared`. Ensure the monorepo workspace links are correct before Phase 1 starts (run `bun install` after Phase 0-A completes).

7. **Environment:** All agents operate on the same repo at `/Users/nirbhayvig/Repositories/Misc/neighbo`. Firebase credentials are in `apps/api/.env` — agents should NOT modify `.env` files.
