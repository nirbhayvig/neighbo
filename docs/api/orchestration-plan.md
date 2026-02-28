# Neighbo API — Agent Orchestration Plan

**Date:** 2026-02-28
**Depends on:** `docs/api/implementation-plan.md`

This document instructs a manager agent on how to spawn and coordinate subagents to implement the full Neighbo API. Each phase is described with agents, their assignments, parallelism constraints, and validation criteria. All agents must read `docs/api/implementation-plan.md` as their primary reference.

---

## Parallelism Overview

```
Phase 1 ────────────────────────────── [2 agents, PARALLEL]
  A: Shared package (types + schemas)
  B: API utilities + middleware

         │
         ▼

Phase 2 ────────────────────────────── [3 agents, PARALLEL, depends on Phase 1]
  A: me.ts (user profile routes)
  B: values.ts (values list route)
  C: restaurants.ts (core + pre-wire sub-route imports)

         │
         ▼

Phase 3 ────────────────────────────── [3 agents, PARALLEL, depends on Phase 2]
  A: reports.ts
  B: certification.ts
  C: business.ts (claim routes + my-restaurant)

         │
         ▼

Phase 4 ────────────────────────────── [1 agent, depends on Phase 3]
  A: app.ts integration + firestore.indexes.json + final validation
```

**Total agents across all phases:** 9
**Max agents at once:** 3 (Phases 2 and 3)

---

## Pre-requisite: Install Dependency

Before spawning any agents, the manager agent must run:

```bash
cd /Users/nirbhayvig/Repositories/Misc/neighbo/apps/api && bun add geofire-common
```

Verify it appears in `apps/api/package.json` under `dependencies`.

---

## Phase 1 — Foundation [2 agents, PARALLEL]

**Run both agents simultaneously. Phase 2 cannot start until BOTH complete.**

---

### Phase 1-A: Shared Package Update

**Agent count:** 1
**Isolation:** worktree (to avoid conflicts with Phase 1-B)

**Task:**
Rewrite and extend the `packages/shared/src/` directory to match the Neighbo data model. The current shared package has generic user types that must be replaced.

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

### Phase 1-B: API Utilities + Middleware

**Agent count:** 1
**Isolation:** worktree (to avoid conflicts with Phase 1-A)

**Note:** These files do NOT import from `@neighbo/shared`. They only depend on `firebase-admin`, `hono`, and `geofire-common`.

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

## Phase 2 — Route Implementations [3 agents, PARALLEL]

**Depends on:** Phase 1-A AND Phase 1-B both complete.
**Run all 3 agents simultaneously. Phase 3 cannot start until ALL complete.**

---

### Phase 2-A: User Profile Routes (`me.ts`)

**Agent count:** 1

**File to create:** `apps/api/src/routes/me.ts`

This file exports a single `Hono<AppEnv>` instance with all user profile endpoints. It must import `authMiddleware` from `../middleware/auth` and apply it to every route.

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

**File to create:** `apps/api/src/routes/values.ts`

This is the simplest route file — one public endpoint.

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

**File to create:** `apps/api/src/routes/restaurants.ts`

This is the most complex route file. It contains the core restaurant routes AND pre-wires the sub-route mounting points for reports, certification, and business claims (Phase 3 agents will create those files, but the `.route()` calls must exist here).

**CRITICAL — Route Order:** Register `GET /nearby` BEFORE `GET /:id`, otherwise `nearby` matches as `:id`.

**Imports required:**
```typescript
import { reportRoutes } from "./reports"           // Phase 3-A will create this
import { certificationRoutes } from "./certification" // Phase 3-B will create this
import { claimRoutes } from "./business-claims"    // Phase 3-C will create this
```
For Phase 2, create stub files for these imports so the file compiles:
- `apps/api/src/routes/reports.ts` — stub exporting `export const reportRoutes = new Hono<AppEnv>()`
- `apps/api/src/routes/certification.ts` — stub
- `apps/api/src/routes/business-claims.ts` — stub

**Endpoints to implement:**

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

**Depends on:** Phase 2-C complete (restaurants.ts scaffold exists with stub imports).
**Run all 3 agents simultaneously. Phase 4 cannot start until ALL complete.**

Each agent replaces a stub file with a full implementation. The `.route()` calls in `restaurants.ts` already wire these in — agents must NOT modify `restaurants.ts`.

---

### Phase 3-A: Community Reports (`reports.ts`)

**Agent count:** 1

**File to modify:** `apps/api/src/routes/reports.ts` (replace stub)

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

**File to modify:** `apps/api/src/routes/certification.ts` (replace stub)

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

**Files to create/modify:**
- `apps/api/src/routes/business-claims.ts` (replace stub) — claim routes mounted inside restaurants
- `apps/api/src/routes/business.ts` (NEW) — top-level `/business` routes

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

## Phase 4 — Integration & Validation [1 agent]

**Depends on:** Phase 3 complete (ALL sub-route files implemented).

**Agent count:** 1

**Task:** Wire all routes into `app.ts`, add the error handler, create `firestore.indexes.json`, and validate the full API typechecks cleanly.

**`apps/api/src/app.ts`** — modify to:

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

1. **Merge strategy:** Phases 1, 2, and 3 are run in worktrees. After each phase's agents complete, merge their changes back to the working branch before starting the next phase.

2. **Stub file cleanup:** Phase 2-C creates stub files for `reports.ts`, `certification.ts`, and `business-claims.ts`. Phase 3 agents replace these stubs. The manager must ensure Phase 3 agents are handed the correct file paths and told to REPLACE (not append to) the stubs.

3. **Conflict risk:** The only file touched by multiple phases is `restaurants.ts`:
   - Phase 2-C creates it fully
   - Phase 3 agents must NOT touch it
   - Communicate this constraint explicitly to Phase 3 agents

4. **Type errors between phases:** After Phase 1 completes, Phase 2 agents may see type errors related to imports from `@neighbo/shared` until the shared package is published/linked. Ensure the monorepo workspace links are correct before Phase 2 starts.

5. **Environment:** All agents operate on the same repo at `/Users/nirbhayvig/Repositories/Misc/neighbo`. Firebase credentials are in `apps/api/.env` — agents should NOT modify `.env` files.
