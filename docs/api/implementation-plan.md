# Neighbo API — Implementation Plan

**Date:** 2026-02-28
**Status:** Ready for Implementation
**Author:** Claude Code

---

## 1. Overview

This document is the authoritative implementation plan for building out the full Neighbo API. It describes every file to be created or modified, every schema to be defined, every route to be implemented, and the order of operations.

**Current state:** The API has two live endpoints (`GET /health`, `GET /me`) and a functioning Firebase Auth middleware. The shared package has user types/schemas that need to be updated to match the Neighbo data model.

**Target state:** All endpoints in `docs/api-features-overview.md §4` implemented and type-safe.

---

## 2. New Dependencies

One new package is required:

| Package | Purpose |
|---------|---------|
| `geofire-common` | Computes geohash values and geohash query bounds for proximity searches |

```bash
cd apps/api && bun add geofire-common
```

No other new dependencies are needed. All existing packages (`hono`, `firebase-admin`, `zod`, `@hono/zod-validator`) are sufficient.

---

## 3. Final Project Structure

```
apps/api/src/
├── index.ts                          # (existing — unchanged)
├── app.ts                            # (MODIFY — mount all new routes)
├── lib/
│   ├── types.ts                      # (existing — unchanged)
│   ├── firebase.ts                   # (existing — unchanged)
│   ├── geo.ts                        # (NEW) Geohash utilities wrapping geofire-common
│   └── pagination.ts                 # (NEW) Cursor encode/decode helpers
├── middleware/
│   ├── auth.ts                       # (existing — unchanged)
│   └── ownership.ts                  # (NEW) Business owner guard middleware
└── routes/
    ├── health.ts                     # (existing — unchanged)
    ├── me.ts                         # (NEW) User profile + favorites + reports
    ├── restaurants.ts                # (NEW) Restaurant CRUD, list/search, nearby
    ├── values.ts                     # (NEW) Values list
    ├── reports.ts                    # (NEW) Community reports (mounted under restaurants)
    ├── certification.ts              # (NEW) Certification (mounted under restaurants)
    └── business.ts                   # (NEW) Business claim management

packages/shared/src/
├── index.ts                          # (MODIFY — re-export all new domains)
├── schemas/
│   ├── index.ts                      # (MODIFY — add new exports)
│   ├── user.ts                       # (REWRITE — align with Neighbo user model)
│   ├── restaurant.ts                 # (NEW) Restaurant schemas
│   ├── report.ts                     # (NEW) Community report schemas
│   ├── value.ts                      # (NEW) Value category schemas
│   ├── certification.ts              # (NEW) Certification schemas
│   └── business.ts                   # (NEW) Business claim schemas
└── types/
    ├── index.ts                      # (MODIFY — add new exports)
    ├── user.ts                       # (REWRITE — align with Neighbo user model)
    ├── restaurant.ts                 # (NEW) Restaurant types
    ├── report.ts                     # (NEW) Community report types
    ├── value.ts                      # (NEW) Value category types
    ├── certification.ts              # (NEW) Certification types
    └── business.ts                   # (NEW) Business claim types
```

---

## 4. Shared Package: Types & Schemas

All Zod schemas are the single source of truth. TypeScript types are always derived via `z.infer<>` — never written by hand. Types are re-exported from `./types/` only as aliases for the inferred schema types.

### 4.1 `packages/shared/src/types/user.ts` (rewrite)

```typescript
export type UserType = "user" | "business"

export type User = {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  userType: UserType
  valuePreferences: string[]
  claimedRestaurantId: string | null
  reportCount: number
  createdAt: string
  updatedAt: string
}

// Re-exported schema inferred types (see schemas/user.ts)
export type { UpdateUserInput, UserPreferencesInput } from "../schemas/user"
```

### 4.2 `packages/shared/src/schemas/user.ts` (rewrite)

```typescript
export const userTypeSchema = z.enum(["user", "business"])

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().nullable().optional(),
  valuePreferences: z.array(z.string()).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

### 4.3 `packages/shared/src/types/restaurant.ts` (new)

```typescript
export type RestaurantValue = {
  slug: string
  label: string
  certTier: number
  selfAttested: boolean
  reportCount: number
  verifiedAt: string | null
}

export type RestaurantSummary = {
  id: string
  googlePlaceId: string
  name: string
  city: string
  values: RestaurantValue[]
  certTierMax: number
  location: { lat: number; lng: number }
  distanceKm?: number
}

export type Restaurant = RestaurantSummary & {
  totalReportCount: number
  claimedByUserId: string | null
  claimStatus: "pending" | "approved" | "rejected" | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}
```

### 4.4 `packages/shared/src/schemas/restaurant.ts` (new)

```typescript
export const createRestaurantSchema = z.object({
  googlePlaceId: z.string().min(1),
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  values: z.array(z.string()).default([]),
})

export const updateRestaurantSchema = z.object({
  values: z.array(z.string()).optional(),
})

export const restaurantListQuerySchema = z.object({
  q: z.string().optional(),
  values: z.string().optional(),       // comma-separated slugs
  city: z.string().optional(),
  certTier: z.coerce.number().min(1).max(3).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().default(5),
  sort: z.enum(["distance", "name", "certTier"]).default("name"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().default(5),
  values: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})
```

### 4.5 `packages/shared/src/types/value.ts` (new)

```typescript
export type ValueCategory =
  | "identity"
  | "social-justice"
  | "labor"
  | "environment"
  | "ownership"
  | "accessibility"

export type Value = {
  slug: string
  label: string
  description: string
  icon: string
  category: ValueCategory
  restaurantCount: number
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}
```

### 4.6 `packages/shared/src/types/report.ts` (new)

```typescript
export type ReportStatus = "active" | "withdrawn"

export type Report = {
  id: string
  restaurantId: string
  restaurantName: string
  userId: string
  values: string[]
  comment: string | null
  status: ReportStatus
  createdAt: string
}

export type ReportAggregate = {
  valueCounts: Record<string, number>
  totalReports: number
}

export type UserReportCheck = {
  hasActiveReport: boolean
  reportedValues: string[]
  nextReportAllowedAt: string | null
}
```

### 4.7 `packages/shared/src/schemas/report.ts` (new)

```typescript
export const createReportSchema = z.object({
  values: z.array(z.string().min(1)).min(1, "Must report at least one value"),
  comment: z.string().max(500).nullable().optional(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
```

### 4.8 `packages/shared/src/types/certification.ts` (new)

```typescript
export type CertTier = 1 | 2 | 3

export type CertificationValue = {
  slug: string
  label: string
  certTier: CertTier
  selfAttested: boolean
  reportCount: number
  verifiedAt: string | null
}

export type Certification = {
  restaurantId: string
  values: CertificationValue[]
  certTierMax: CertTier
  totalReportCount: number
}
```

### 4.9 `packages/shared/src/schemas/certification.ts` (new)

```typescript
export const selfAttestSchema = z.object({
  values: z.array(z.string().min(1)).min(1, "Must attest at least one value"),
})

export const uploadEvidenceSchema = z.object({
  valueSlug: z.string().min(1),
  fileURLs: z.array(z.string().url()),
  description: z.string().max(1000).optional(),
})

export type SelfAttestInput = z.infer<typeof selfAttestSchema>
export type UploadEvidenceInput = z.infer<typeof uploadEvidenceSchema>
```

### 4.10 `packages/shared/src/types/business.ts` (new)

```typescript
export type ClaimRole = "owner" | "manager" | "authorized-rep"
export type ClaimStatus = "pending" | "approved" | "rejected"

export type BusinessClaim = {
  id: string
  restaurantId: string
  restaurantName: string
  userId: string
  userEmail: string
  ownerName: string
  role: ClaimRole
  phone: string
  email: string
  evidenceDescription: string | null
  evidenceFileURLs: string[]
  status: ClaimStatus
  createdAt: string
}
```

### 4.11 `packages/shared/src/schemas/business.ts` (new)

```typescript
export const claimRoleSchema = z.enum(["owner", "manager", "authorized-rep"])

export const createClaimSchema = z.object({
  ownerName: z.string().min(1).max(200),
  role: claimRoleSchema,
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  evidenceDescription: z.string().max(1000).optional(),
})

export type CreateClaimInput = z.infer<typeof createClaimSchema>
```

---

## 5. Utilities

### 5.1 `apps/api/src/lib/geo.ts`

Wraps `geofire-common` to keep geohash logic isolated.

```typescript
import { geohashForPoint, geohashQueryBounds, distanceBetween } from "geofire-common"

// Compute a geohash string (precision 9) for a lat/lng
export function computeGeohash(lat: number, lng: number): string {
  return geohashForPoint([lat, lng])
}

// Return the geohash range pairs needed to cover a radius around a center point
// radiusKm is in kilometers
export function getGeohashBounds(
  lat: number,
  lng: number,
  radiusKm: number,
): Array<[string, string]> {
  return geohashQueryBounds([lat, lng], radiusKm * 1000)
}

// Compute Haversine distance between two points, returns kilometers
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return distanceBetween([lat1, lng1], [lat2, lng2])
}
```

### 5.2 `apps/api/src/lib/pagination.ts`

Cursor-based pagination helpers. Cursors are base64-encoded JSON blobs containing the last document ID seen.

```typescript
// Encode a document ID into an opaque cursor string
export function encodeCursor(lastDocId: string): string {
  return Buffer.from(JSON.stringify({ lastDocId })).toString("base64url")
}

// Decode a cursor string back to a document ID, returns null on invalid input
export function decodeCursor(cursor: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    return typeof decoded.lastDocId === "string" ? decoded.lastDocId : null
  } catch {
    return null
  }
}
```

---

## 6. Middleware

### 6.1 `apps/api/src/middleware/ownership.ts`

Business owner guard. Placed after `authMiddleware` on routes that require restaurant ownership. Reads the user's `claimedRestaurantId` from Firestore and verifies it matches the `:id` param.

```typescript
// Checks that c.var.user owns the restaurant identified by c.req.param("id")
// Depends on authMiddleware having run first (c.var.user set)
// Throws 403 if the user is not the owner
export const requireOwnership = createMiddleware<AppEnv>(async (c, next) => {
  const restaurantId = c.req.param("id")
  const userDoc = await db.collection("users").doc(c.var.user.uid).get()
  const data = userDoc.data()
  if (!data || data.claimedRestaurantId !== restaurantId) {
    throw new HTTPException(403, { message: "Not the owner of this restaurant" })
  }
  await next()
})
```

---

## 7. Route Implementations

### 7.1 `apps/api/src/routes/me.ts`

Handles all `/me/*` routes.

**Mounted at:** `.route("/me", meRoutes)` in `app.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Authenticated | Upsert + return full user profile |
| PATCH | `/me` | Authenticated | Update profile fields |
| GET | `/me/favorites` | Authenticated | List favorited restaurants (paginated) |
| POST | `/me/favorites/:restaurantId` | Authenticated | Add favorite (idempotent) |
| DELETE | `/me/favorites/:restaurantId` | Authenticated | Remove favorite |
| GET | `/me/reports` | Authenticated | List user's own reports (paginated) |

**Implementation notes:**

**GET /me:**
- Query `users/{uid}` from Firestore
- If document does not exist, create it with fields from `DecodedIdToken` (uid, email, displayName, photoURL), set `userType: "user"`, `valuePreferences: []`, `claimedRestaurantId: null`, `reportCount: 0`
- Return full User object (exclude no fields — it's the user's own data)

**PATCH /me:**
- Validate body with `updateUserSchema`
- Build partial update object (only include provided fields)
- Set `updatedAt: FieldValue.serverTimestamp()`
- Merge-update `users/{uid}`
- Return updated user doc

**GET /me/favorites:**
- Query `users/{uid}/favorites` ordered by `addedAt DESC`
- Apply cursor pagination using `decodeCursor` to get start-after doc
- Default limit: 20
- Return `{ favorites: [...], nextCursor: string | null }`

**POST /me/favorites/:restaurantId:**
- Verify restaurant exists in `restaurants/{restaurantId}` (throw 404 if not)
- Write to `users/{uid}/favorites/{restaurantId}` with denormalized name/city
- Idempotent — use `set()` (overwrites if exists)

**DELETE /me/favorites/:restaurantId:**
- Delete `users/{uid}/favorites/{restaurantId}`
- Return 204 No Content (idempotent — no error if not found)

**GET /me/reports:**
- Query `reports` where `userId == uid` ordered by `createdAt DESC`
- Apply cursor pagination
- Default limit: 20
- Return `{ reports: [...], nextCursor: string | null }`

---

### 7.2 `apps/api/src/routes/restaurants.ts`

Handles all `/restaurants` and `/restaurants/:id` routes.

**Mounted at:** `.route("/restaurants", restaurantRoutes)` in `app.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants` | Public | List/search with filters |
| GET | `/restaurants/nearby` | Public | Geo proximity search |
| GET | `/restaurants/:id` | Public | Get single restaurant |
| POST | `/restaurants` | Authenticated | Create new listing |
| PATCH | `/restaurants/:id` | Business Owner | Update restaurant values |
| DELETE | `/restaurants/:id` | Authenticated | Soft-delete |

**Implementation notes:**

**GET /restaurants:**

Query parameters validated with `restaurantListQuerySchema`.

Query construction logic (all queries filter `deletedAt == null`):

1. **Text search (`?q`):** Firestore does not support full-text search. For MVP, case-insensitive prefix matching is not available natively. Strategy: fetch all results (up to 200) and filter client-side with `name.toLowerCase().includes(q.toLowerCase())`. Document this limitation in the API.

2. **Value filtering (`?values=black-owned,sustainable`):** Split by comma. Use `array-contains` on `valueSlugs` for the first value. Filter remaining values in application code (post-query).

3. **City filter (`?city`):** Add `.where("city", "==", city)` to the query.

4. **Cert tier filter (`?certTier`):** Add `.where("certTierMax", ">=", certTier)`.

5. **Geo filter (`?lat&lng&radius`):** Use geohash bounds query (see geo strategy in `docs/firestore-data-structure.md §5`). When lat/lng provided, ignore other sorting and sort by distance.

6. **Sorting:**
   - `distance` — requires lat/lng, apply post-query
   - `name` — `.orderBy("name", "asc")`
   - `certTier` — `.orderBy("certTierMax", "desc")`

7. **Pagination:** Cursor-based. Encode last document ID. On subsequent calls, fetch that doc and use `.startAfter(doc)`.

Response shape:
```json
{ "restaurants": [...RestaurantSummary], "nextCursor": "string | null" }
```

**GET /restaurants/nearby:**

IMPORTANT: This route must be registered BEFORE `GET /restaurants/:id` to avoid the path `nearby` being matched as an `:id` param.

- Validate with `nearbyQuerySchema` (requires `lat`, `lng`)
- Use `getGeohashBounds(lat, lng, radius)` to get geohash ranges
- Execute parallel Firestore queries for each range bound
- Merge results (deduplicate by document ID)
- Filter `deletedAt == null` post-merge
- Compute `distanceKm` for each result using `haversineDistance`
- Filter to exact radius (remove results outside radius)
- Optionally filter by `?values` (application-side)
- Sort by `distanceKm` ascending
- Apply limit
- Return `{ restaurants: [...RestaurantSummary & { distanceKm }] }`

**GET /restaurants/:id:**
- Fetch `restaurants/{id}` from Firestore
- Throw 404 if not found or `deletedAt != null`
- Fetch value labels from `values` collection for each slug (batch get)
- Merge label into the response `values` array
- Return full Restaurant object

**POST /restaurants:**
- Requires auth
- Validate body with `createRestaurantSchema`
- Check that `googlePlaceId` is not already in use (query `restaurants` where `googlePlaceId == id` and `deletedAt == null`)
- Compute geohash from location
- Fetch value label for each provided slug (verify slugs are valid)
- Build `values` array with `certTier: 1`, `selfAttested: false`, `reportCount: 0`
- Write to `restaurants` with `valueSlugs` denormalized, `certTierMax: 1`
- Increment `restaurantCount` on each `values/{slug}` doc (batch write)
- Return created restaurant

**PATCH /restaurants/:id:**
- Requires auth + ownership (apply `requireOwnership` middleware)
- Validate body with `updateRestaurantSchema`
- If `values` provided, fetch labels and rebuild full `values` array + `valueSlugs`
- Recalculate `certTierMax` (max of all current `certTier` values)
- Update Firestore `restaurants/{id}` with new values + `updatedAt`
- Return updated restaurant

**DELETE /restaurants/:id:**
- Requires auth
- Set `deletedAt: FieldValue.serverTimestamp()` on `restaurants/{id}`
- Return 204 No Content

---

### 7.3 `apps/api/src/routes/values.ts`

Handles `/values`.

**Mounted at:** `.route("/values", valuesRoutes)` in `app.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/values` | Public | List all active value categories |

**Implementation notes:**

**GET /values:**
- Query `values` collection where `active == true` ordered by `sortOrder ASC`
- Return `{ values: [...Value] }`
- Result is stable and rarely changes — suitable for caching on the frontend

---

### 7.4 `apps/api/src/routes/reports.ts`

Handles community report routes, nested under `/restaurants/:id/reports`.

**Mounted at:** Inside the restaurants route handler or mounted separately in `app.ts`. Because these routes are parameterized by `:id`, they are best defined within `restaurants.ts` by calling `.route("/:id/reports", reportRoutes)` on the restaurants Hono instance.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants/:id/reports` | Public | Aggregated report counts |
| POST | `/restaurants/:id/reports` | Authenticated | Submit a report |
| GET | `/restaurants/:id/reports/mine` | Authenticated | Check user's active report |

**Implementation notes:**

**GET /restaurants/:id/reports:**
- Query `reports` where `restaurantId == id` and `status == "active"`
- Aggregate `valueCounts` by grouping on `values` array
- Return `{ valueCounts: Record<string, number>, totalReports: number }`
- Individual reporter UIDs are NEVER exposed

**POST /restaurants/:id/reports:**
- Validate body with `createReportSchema`
- Verify restaurant exists (throw 404 if not)
- Rate-limit check: query `reports` where `userId == uid`, `restaurantId == id`, `createdAt >= now - 30 days`
  - If found, throw 429 with `nextReportAllowedAt` in response body
- Create report document in `reports` collection
- Increment `totalReportCount` on `restaurants/{id}` by 1 (transaction)
- For each reported value slug:
  - Increment `reportCount` within `restaurants/{id}.values[slug]` (transaction)
  - Check if that value now has `reportCount >= 3` and `certTier < 2` → promote to Tier 2
  - Recalculate `certTierMax` on restaurant doc
- Increment `reportCount` on `users/{uid}` by 1
- Return created report with `nextReportAllowedAt` (createdAt + 30 days)

**GET /restaurants/:id/reports/mine:**
- Query `reports` where `userId == uid`, `restaurantId == id`, `createdAt >= now - 30 days`, `status == "active"`, limit 1
- Return `{ hasActiveReport: boolean, reportedValues: string[], nextReportAllowedAt: string | null }`

---

### 7.5 `apps/api/src/routes/certification.ts`

Handles certification routes, nested under `/restaurants/:id/certification`.

**Mounted at:** Inside `restaurants.ts` via `.route("/:id/certification", certRoutes)`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants/:id/certification` | Public | Full certification detail |
| POST | `/restaurants/:id/certification/self-attest` | Business Owner | Attest values |
| POST | `/restaurants/:id/certification/upload-evidence` | Business Owner | Record evidence metadata |

**Implementation notes:**

**GET /restaurants/:id/certification:**
- Fetch `restaurants/{id}`
- For each value in `values` array, fetch label from `values/{slug}`
- Return full `Certification` object with per-value tier, report counts, evidence status

**POST /restaurants/:id/certification/self-attest:**
- Requires auth + `requireOwnership`
- Validate body with `selfAttestSchema`
- For each slug in `values`:
  - If slug already exists in restaurant `values` array, update `selfAttested: true`, bump `certTier` to at least 1
  - If slug does not exist, add with `certTier: 1`, `selfAttested: true`, `reportCount: 0`
- Update `valueSlugs` (denormalized flat array)
- Recalculate `certTierMax`
- Update `updatedAt`
- Return updated certification

**POST /restaurants/:id/certification/upload-evidence:**
- Requires auth + `requireOwnership`
- Validate body with `uploadEvidenceSchema`
- Record the file URLs and description in a new `verificationRequests` sub-document or field on the restaurant
  - For MVP: store as an array field `pendingEvidenceUploads` on `businessClaims/{claimId}` or a new top-level subcollection `restaurants/{id}/evidenceUploads`
  - Recommended: `restaurants/{id}/evidenceUploads/{autoId}` subcollection document
- Return `{ success: true, message: "Evidence submitted for review" }`

---

### 7.6 `apps/api/src/routes/business.ts`

Handles business claim routes.

**Mounted at:** `.route("/restaurants", restaurantRoutes)` (claim routes are on `:id`) and `.route("/business", businessRoutes)` in `app.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/restaurants/:id/claim` | Authenticated | Submit claim |
| GET | `/restaurants/:id/claim` | Business Owner | Get claim status |
| GET | `/business/my-restaurant` | Authenticated | Get owned restaurant |

**Implementation notes:**

**POST /restaurants/:id/claim:**
- Requires auth
- Validate body with `createClaimSchema`
- Verify restaurant exists
- Verify restaurant is not already claimed (`claimedByUserId != null` and `claimStatus == "approved"`) — throw 409
- Verify user does not already own another restaurant (read `users/{uid}.claimedRestaurantId`) — throw 409
- Check for existing pending claim from this user for this restaurant — return 200 with existing claim if found (idempotent)
- Create document in `businessClaims` collection
- Set `restaurants/{id}.claimStatus = "pending"` and `restaurants/{id}.claimedByUserId = uid`
- Return created claim

**GET /restaurants/:id/claim:**
- Requires auth + `requireOwnership`
- Query `businessClaims` where `restaurantId == id` and `userId == uid` ordered by `createdAt DESC` limit 1
- Return claim document

**GET /business/my-restaurant:**
- Requires auth
- Read `users/{uid}.claimedRestaurantId`
- If null, return `{ restaurant: null }`
- Fetch `restaurants/{claimedRestaurantId}`
- Return full restaurant document

---

## 8. `apps/api/src/app.ts` Route Registration

The existing `app.ts` must have all new routes mounted while preserving the unbroken chain required for `AppType` inference.

```typescript
import { meRoutes } from "./routes/me"
import { restaurantRoutes } from "./routes/restaurants"
import { valuesRoutes } from "./routes/values"
import { businessRoutes } from "./routes/business"

const app = new Hono<AppEnv>()
  .use(logger())
  .use("*", cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }))
  .route("/health", healthRoutes)
  .route("/me", meRoutes)
  .route("/restaurants", restaurantRoutes)  // includes /restaurants/:id/reports and /certification
  .route("/values", valuesRoutes)
  .route("/business", businessRoutes)

export type AppType = typeof app
export default app
```

**Critical constraint:** The route chain must remain unbroken. Each `.route()` call returns a new typed Hono instance. If any route file uses `app.route()` instead of chaining, the type is lost. Every route file must export a `Hono<AppEnv>` instance directly (not a factory function wrapping it).

---

## 9. Route Nesting Strategy

Sub-routes for reports and certification are mounted within `restaurants.ts` to share the `:id` param naturally:

```typescript
// In restaurants.ts
import { reportRoutes } from "./reports"
import { certificationRoutes } from "./certification"
import { claimRoutes } from "./business-claims"

const restaurantRoutes = new Hono<AppEnv>()
  .get("/", ...) // GET /restaurants
  .get("/nearby", ...) // GET /restaurants/nearby — MUST be before /:id
  .get("/:id", ...) // GET /restaurants/:id
  .post("/", ...) // POST /restaurants
  .patch("/:id", ...) // PATCH /restaurants/:id
  .delete("/:id", ...) // DELETE /restaurants/:id
  .route("/:id/reports", reportRoutes)
  .route("/:id/certification", certificationRoutes)
  .route("/:id", claimRoutes) // POST /:id/claim, GET /:id/claim

export { restaurantRoutes }
```

---

## 10. Firestore Transaction Strategy

Several operations require atomicity:

| Operation | Strategy |
|-----------|----------|
| Submit report + increment counters | Firestore transaction wrapping report create + restaurant counter updates + user counter update |
| Self-attest values + tier recalculation | Firestore transaction wrapping value upsert + certTierMax recalculation |
| Claim restaurant + set claim status | Firestore transaction wrapping businessClaims create + restaurants update |
| Create restaurant + increment value counts | Batch write (not transaction — no read-before-write needed) |

---

## 11. Error Handling Conventions

All routes use Hono's `HTTPException` for structured errors:

| HTTP Status | When |
|-------------|------|
| 400 | Validation failure (Zod errors via @hono/zod-validator) |
| 401 | Missing or invalid Firebase token |
| 403 | Authenticated but not authorized (not owner) |
| 404 | Resource not found or soft-deleted |
| 409 | Conflict (duplicate claim, restaurant already claimed) |
| 429 | Rate limit exceeded (report rate limit) |
| 500 | Unexpected server error |

A global error handler is added in `app.ts`:

```typescript
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: "Internal server error" }, 500)
})
```

---

## 12. Environment Variables

Update `.env.example`:

```
PORT=3001
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
FIREBASE_PROJECT_ID=your-project-id
CORS_ORIGIN=http://localhost:5173
```

No new environment variables needed. Google Places API calls happen on the frontend, not the API.

---

## 13. Firestore Indexes

The following composite indexes must be created in Firestore (via Firebase Console or `firestore.indexes.json`). These are required before the API can run geo queries and rate-limit queries.

```json
{
  "indexes": [
    {
      "collectionGroup": "restaurants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deletedAt", "order": "ASCENDING" },
        { "fieldPath": "valueSlugs", "arrayConfig": "CONTAINS" },
        { "fieldPath": "certTierMax", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "restaurants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deletedAt", "order": "ASCENDING" },
        { "fieldPath": "valueSlugs", "arrayConfig": "CONTAINS" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "restaurants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deletedAt", "order": "ASCENDING" },
        { "fieldPath": "city", "order": "ASCENDING" },
        { "fieldPath": "valueSlugs", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "restaurants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deletedAt", "order": "ASCENDING" },
        { "fieldPath": "geohash", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "restaurantId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "restaurantId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "businessClaims",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "businessClaims",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "restaurantId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 14. API Scaffolding (Phase 0)

The frontend is built in parallel with the backend. Before any Firestore logic is written, all routes must exist as stubs that return correctly-typed mock responses. This gives the frontend team a fully-wired `AppType` to build against immediately.

### What a stub route looks like

A stub registers the correct HTTP method, path, auth middleware, and Zod validator, but returns hardcoded mock data instead of querying Firestore.

**Rules:**
- All routes are registered (correct method + path)
- Auth middleware applied where required
- Zod validators applied where required — request validation is live from day 1
- Responses satisfy the correct TypeScript type (use `satisfies`)
- No Firestore calls, no business logic, no side effects

**Example:**

```typescript
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware } from "../middleware/auth"
import { createRestaurantSchema, updateRestaurantSchema } from "@neighbo/shared/schemas"
import type { Restaurant } from "@neighbo/shared/types"
import type { AppEnv } from "../lib/types"

const STUB: Restaurant = {
  id: "stub-id",
  googlePlaceId: "ChIJ_stub",
  name: "Stub Restaurant",
  city: "Minneapolis",
  values: [],
  certTierMax: 1,
  location: { lat: 44.97, lng: -93.26 },
  totalReportCount: 0,
  claimedByUserId: null,
  claimStatus: null,
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const restaurantRoutes = new Hono<AppEnv>()
  .get("/nearby", (c) => c.json({ restaurants: [] }))
  .get("/", (c) => c.json({ restaurants: [STUB], nextCursor: null }))
  .get("/:id", (c) => c.json(STUB))
  .post("/", authMiddleware, zValidator("json", createRestaurantSchema), (c) => c.json(STUB, 201))
  .patch("/:id", authMiddleware, zValidator("json", updateRestaurantSchema), (c) => c.json(STUB))
  .delete("/:id", authMiddleware, (c) => new Response(null, { status: 204 }))
  .route("/:id/reports", reportRoutes)
  .route("/:id/certification", certificationRoutes)
  .route("/:id", claimRoutes)
```

### Mock response shapes per route file

| Route file | Mock responses |
|------------|----------------|
| `me.ts` | `GET /` → mock User; `GET /favorites` → `{ favorites: [], nextCursor: null }`; `GET /reports` → `{ reports: [], nextCursor: null }`; mutations → `{ success: true }` or 204 |
| `values.ts` | `GET /` → `{ values: [] }` |
| `restaurants.ts` | List → `{ restaurants: [STUB], nextCursor: null }`; single → `STUB`; mutations → `STUB` or 204 |
| `reports.ts` | Aggregate → `{ valueCounts: {}, totalReports: 0 }`; POST → mock Report; `/mine` → `{ hasActiveReport: false, reportedValues: [], nextReportAllowedAt: null }` |
| `certification.ts` | `GET /` → mock Certification; mutations → mock Certification or `{ success: true, message: "..." }` |
| `business-claims.ts` | Both routes → mock BusinessClaim |
| `business.ts` | `GET /my-restaurant` → `{ restaurant: null }` |

### Deliverable

After Phase 0: `bun run typecheck` passes, `app.ts` exports a fully-wired `AppType` with all routes, and the frontend can make type-safe calls to every endpoint.

---

## 15. Implementation Order

Implement in this sequence to ensure each phase is functional before moving on:

### Phase 0: Scaffolding (frontend-unblocking)
1. Update `packages/shared` — rewrite user types/schemas, add all new domain schemas and types, update barrel exports
2. Install `geofire-common` dependency
3. Create all route files as stubs (`me.ts`, `values.ts`, `restaurants.ts`, `reports.ts`, `certification.ts`, `business-claims.ts`, `business.ts`) — all routes defined, mock responses, no Firestore
4. Update `apps/api/src/app.ts` to mount all routes and add global error handler
5. Verify `bun run typecheck` passes — frontend is now unblocked

### Phase 1: Foundation (utilities)
6. Create `apps/api/src/lib/geo.ts`
7. Create `apps/api/src/lib/pagination.ts`
8. Create `apps/api/src/middleware/ownership.ts`

### Phase 2: User Routes
9. Replace `me.ts` stub with full Firestore implementation (all 6 endpoints)

### Phase 3: Values Route
10. Replace `values.ts` stub with full Firestore implementation

### Phase 4: Restaurants
11. Replace `restaurants.ts` stub — basic CRUD first (GET /:id, POST, DELETE)
12. Add list/search (`GET /restaurants`) with value + city filtering
13. Add nearby (`GET /restaurants/nearby`) with geohash queries

### Phase 5: Reports
14. Replace `reports.ts` stub with full implementation

### Phase 6: Certification
15. Replace `certification.ts` stub with full implementation

### Phase 7: Business
16. Replace `business-claims.ts` and `business.ts` stubs with full implementation

### Phase 8: Polish
17. Verify all routes match API contracts in `docs/api-features-overview.md`
18. Run `bun run typecheck` — fix all type errors
19. Run `bunx biome check --write .` — fix all lint/format issues
20. Create `firestore.indexes.json` at repo root

---

## 16. API Contract Compliance

This implementation conforms to all contracts in `docs/api-features-overview.md` with the following clarifications:

- **`GET /restaurants` text search (`?q`):** Full-text search is not natively available in Firestore. For MVP, results are fetched (up to 200) and filtered in-memory. This is acceptable for the Twin Cities dataset of ~500 listings.
- **`PATCH /restaurants/:id` auth:** The overview spec says "Business Owner" auth. This is enforced via `authMiddleware` + `requireOwnership`.
- **`POST /restaurants/:id/certification/upload-evidence`:** Actual file upload goes to Firebase Storage and is handled client-side. This endpoint records the resulting URLs/metadata only.
- **Tier 2 auto-promotion:** Happens inside the `POST /restaurants/:id/reports` transaction — no separate endpoint needed.

No breaking changes to existing API contracts. The `GET /me` response is extended (more fields returned) but remains backwards compatible.
