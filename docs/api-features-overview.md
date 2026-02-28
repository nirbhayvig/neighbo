# Neighbo API — Features Overview

## 1. API Overview

The Neighbo API is a Hono.js application running on Bun (port 3001). It follows a factory pattern where all route registrations are chained on a single `app` instance so that the full route shape is captured as `AppType` — enabling end-to-end type-safe RPC calls from the React frontend via `hc<AppType>`.

**Key architectural facts:**

- **Runtime:** Bun
- **Framework:** Hono.js with factory pattern (`createFactory<AppEnv>()`)
- **Auth:** Firebase Admin SDK verifies ID tokens from the `Authorization: Bearer <token>` header. The decoded token is set as `c.var.user` (type `DecodedIdToken`).
- **Database:** Firestore via `firebase-admin/firestore` (exported as `db` from `apps/api/src/lib/firebase.ts`)
- **Validation:** Zod schemas in `packages/shared`, applied via `@hono/zod-validator`
- **Route pattern:** Routes are defined as standalone Hono instances and mounted via `.route("/path", routeHandler)` on the main chain. Per-route auth is applied inline rather than globally, so public endpoints remain accessible without a token.
- **CORS:** Configured for the web frontend origin (`http://localhost:5173` in dev)
- **Proxy:** The Vite dev server proxies `/api/*` to `localhost:3001`, stripping the `/api` prefix

**Google Places API integration:**

Neighbo uses a "cache minimal, fetch at runtime" strategy. We store only what is needed for search and map queries in Firestore (`googlePlaceId`, `name`, `location`, `geohash`, `city`). Full restaurant details — address, hours, phone, website, photos, and Google reviews — are fetched directly from the Google Places API on the frontend when a user opens a detail page. This keeps our database lean and data always fresh.

**Existing endpoints (as of current codebase):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Health check returning `{ status, timestamp }` |
| GET | `/me` | Authenticated | Returns `{ uid, email }` for the current user |

---

## 2. User Capabilities (Consumer)

### Discovery & Search
- Browse all restaurant/bar listings with value badges
- Filter listings by one or more values (AND logic)
- Search by name or location/city
- View nearby restaurants using device geolocation (geo-query)
- View restaurants on a map with pins

### Restaurant Details
- View listing page: name, values badges, certification tier, report counts
- Full details (address, hours, phone, website, photos, Google reviews) loaded from Google Places API at runtime
- Get directions link (deep-links to Google Maps)
- Share a restaurant listing

### Community Participation
- Submit a community report for a restaurant (select values, optional comment)
- Rate-limited to one report per restaurant per 30-day period
- View aggregated report counts per value on each restaurant

### Personal Account
- View and update own profile (display name, photo, value preferences)
- Save/unsave restaurants as favorites
- View own report history
- Set personal value preferences for personalized sorting

---

## 3. Business User Capabilities

A business user account is linked to exactly one restaurant. Business users claim an unclaimed restaurant listing; subsequent claims on the same listing are rejected.

### Listing Management
- Claim ownership of an existing restaurant listing (one restaurant per account)
- Add/update values self-attestation (Tier 1)
- Upload verification documents for Tier 3 certification

---

## 4. API Endpoints

All paths below are relative to the API root (e.g., `http://localhost:3001`). The frontend accesses them via the `/api` proxy prefix.

**Auth levels:**
- **Public** — no token required
- **Authenticated** — valid Firebase ID token required (any user type)
- **Business Owner** — authenticated + must own the referenced restaurant (`userType === "business"` and `claimedRestaurantId === :id`)

---

### 4.1 Health & System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Health check. Returns `{ status: "ok", timestamp: string }` |

---

### 4.2 User Profile & Account

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Authenticated | Get current user profile. Creates user document in Firestore on first call if not exists (upsert pattern). Returns full `User` object including user type, value preferences, and timestamps. |
| PATCH | `/me` | Authenticated | Update current user profile. Accepts partial updates: `displayName`, `photoURL`, `valuePreferences` (array of value slugs). |
| GET | `/me/favorites` | Authenticated | List current user's favorited restaurants. Returns array of restaurant summary objects. Supports `?cursor` for pagination. |
| POST | `/me/favorites/:restaurantId` | Authenticated | Add a restaurant to favorites. Idempotent. |
| DELETE | `/me/favorites/:restaurantId` | Authenticated | Remove a restaurant from favorites. |
| GET | `/me/reports` | Authenticated | List reports submitted by current user. Supports `?cursor` pagination. |

**Request/response shapes:**

`GET /me` response:
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "displayName": "Jane Doe",
  "photoURL": "https://...",
  "userType": "user",
  "valuePreferences": ["lgbtq-friendly", "black-owned"],
  "createdAt": "2026-02-28T00:00:00.000Z",
  "updatedAt": "2026-02-28T00:00:00.000Z"
}
```

`PATCH /me` request body:
```json
{
  "displayName": "Jane D.",
  "valuePreferences": ["lgbtq-friendly", "sustainable"]
}
```

---

### 4.3 Restaurants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants` | Public | List/search restaurants. Supports query params: `?q` (text search on name), `?values` (comma-separated value slugs, AND logic), `?city` (city filter), `?certTier` (minimum tier), `?lat&lng&radius` (geo query in km), `?sort` (distance/name/certTier), `?cursor&limit` (pagination, default limit 20). |
| GET | `/restaurants/nearby` | Public | Shorthand geo query. Requires `?lat&lng`, optional `?radius` (default 5km), `?values`, `?limit`. Returns restaurants sorted by distance with `distanceKm` field appended. |
| GET | `/restaurants/:id` | Public | Get restaurant detail: values, certification info, report counts. Does not include address/hours/phone/website — those come from Google Places API on the frontend using `googlePlaceId`. |
| POST | `/restaurants` | Authenticated | Create a new restaurant listing. Requires `googlePlaceId`. Used for initial data entry. |
| PATCH | `/restaurants/:id` | Business Owner | Update restaurant values data. Business owners can only update their own claimed restaurant. |
| DELETE | `/restaurants/:id` | Authenticated | Soft-delete a restaurant (sets `deletedAt` timestamp). |

**`GET /restaurants` response:**
```json
{
  "restaurants": [
    {
      "id": "rest_abc123",
      "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "name": "Soul Bowl",
      "city": "Minneapolis",
      "values": [
        { "slug": "black-owned", "label": "Black Owned", "certTier": 2 }
      ],
      "certTierMax": 2,
      "location": { "lat": 44.9778, "lng": -93.2650 },
      "distanceKm": 1.2
    }
  ],
  "nextCursor": "eyJsYXN0SWQiOi..."
}
```

**`GET /restaurants/:id` response:**
```json
{
  "id": "rest_abc123",
  "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "name": "Soul Bowl",
  "city": "Minneapolis",
  "values": [
    {
      "slug": "black-owned",
      "label": "Black Owned",
      "certTier": 2,
      "reportCount": 5,
      "selfAttested": true
    }
  ],
  "certTierMax": 2,
  "totalReportCount": 7,
  "location": { "lat": 44.9778, "lng": -93.2650 },
  "claimedByUserId": null,
  "claimStatus": null,
  "createdAt": "2026-01-15T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z"
}
```

**`POST /restaurants` request body:**
```json
{
  "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "name": "Soul Bowl",
  "city": "Minneapolis",
  "location": { "lat": 44.9778, "lng": -93.2650 },
  "values": ["black-owned", "poc-owned"]
}
```

---

### 4.4 Values & Tags

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/values` | Public | List all value categories. Returns array of `{ slug, label, description, icon, category }`. Used to populate filter UIs and report forms. |

**`GET /values` response:**
```json
{
  "values": [
    {
      "slug": "lgbtq-friendly",
      "label": "LGBTQ+ Friendly",
      "description": "Welcoming and affirming to LGBTQ+ customers and employees",
      "icon": "rainbow",
      "category": "identity"
    },
    {
      "slug": "anti-ice",
      "label": "Anti-ICE / Immigration Sanctuary",
      "description": "Has publicly declared solidarity with immigrant communities",
      "icon": "shield",
      "category": "social-justice"
    },
    {
      "slug": "union",
      "label": "Labor-Friendly / Union",
      "description": "Supports organized labor, fair wages, and worker rights",
      "icon": "handshake",
      "category": "labor"
    },
    {
      "slug": "sustainable",
      "label": "Environmental / Sustainable",
      "description": "Prioritizes sustainable sourcing, waste reduction, or eco-friendly practices",
      "icon": "leaf",
      "category": "environment"
    },
    {
      "slug": "black-owned",
      "label": "Black-Owned",
      "description": "Owned by Black entrepreneurs",
      "icon": "fist",
      "category": "ownership"
    },
    {
      "slug": "woman-owned",
      "label": "Woman-Owned",
      "description": "Owned by women",
      "icon": "venus",
      "category": "ownership"
    },
    {
      "slug": "disability-friendly",
      "label": "Disability-Friendly",
      "description": "Accessible facilities and accommodating to people with disabilities",
      "icon": "accessibility",
      "category": "accessibility"
    },
    {
      "slug": "indigenous-owned",
      "label": "Indigenous-Owned",
      "description": "Owned by Indigenous peoples",
      "icon": "feather",
      "category": "ownership"
    },
    {
      "slug": "immigrant-owned",
      "label": "Immigrant-Owned",
      "description": "Owned by immigrants",
      "icon": "globe",
      "category": "ownership"
    },
    {
      "slug": "worker-cooperative",
      "label": "Worker Cooperative",
      "description": "Owned and operated cooperatively by workers",
      "icon": "users",
      "category": "labor"
    },
    {
      "slug": "poc-owned",
      "label": "POC-Owned",
      "description": "Owned by people of color",
      "icon": "circle",
      "category": "ownership"
    }
  ]
}
```

---

### 4.5 Certification & Verification

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants/:id/certification` | Public | Get certification details for a restaurant: per-value tier, report counts, verification evidence status. |
| POST | `/restaurants/:id/certification/self-attest` | Business Owner | Business owner self-attests values (creates Tier 1 certifications for specified values). Request body: `{ values: ["lgbtq-friendly", "sustainable"] }`. |
| POST | `/restaurants/:id/certification/upload-evidence` | Business Owner | Upload verification documents for Tier 3 review. Accepts file metadata (actual file upload goes to Firebase Storage; this endpoint records the metadata). |

**Tier promotion logic (automated):**
- **Tier 1:** Created when business self-attests or when first community report is submitted
- **Tier 2:** Automatically promoted when 3+ independent community reports confirm the same value
- **Tier 3:** Requires manual approval after evidence review (future capability)

---

### 4.6 Community Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/restaurants/:id/reports` | Public | Get aggregated report counts per value for a restaurant. Does not expose individual reporter identities. Returns `{ valueCounts: { "black-owned": 5, "sustainable": 3 }, totalReports: 8 }`. |
| POST | `/restaurants/:id/reports` | Authenticated | Submit a community report. Rate-limited: one report per user per restaurant per 30-day rolling window. |
| GET | `/restaurants/:id/reports/mine` | Authenticated | Check if the current user has an active (within 30 days) report for this restaurant, and what values they reported. Used to disable/enable the report button on the frontend. |

**`POST /restaurants/:id/reports` request body:**
```json
{
  "values": ["black-owned", "sustainable"],
  "comment": "I spoke with the owner and confirmed they source locally and are Black-owned."
}
```

**`POST /restaurants/:id/reports` response:**
```json
{
  "id": "rpt_abc123",
  "restaurantId": "rest_abc123",
  "values": ["black-owned", "sustainable"],
  "comment": "I spoke with the owner...",
  "createdAt": "2026-02-28T12:00:00.000Z",
  "nextReportAllowedAt": "2026-03-30T12:00:00.000Z"
}
```

**Rate limiting:** The API checks for an existing report from the same `uid` for the same `restaurantId` within the last 30 days. If found, returns `429 Too Many Requests` with the `nextReportAllowedAt` timestamp.

---

### 4.7 Business Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/restaurants/:id/claim` | Authenticated | Submit a business ownership claim. One restaurant per business account. |
| GET | `/restaurants/:id/claim` | Business Owner | Get claim status for a restaurant. |
| GET | `/business/my-restaurant` | Authenticated | Get the restaurant claimed/owned by the current business user. Returns `null` if the user has not claimed a restaurant. |

**`POST /restaurants/:id/claim` request body:**
```json
{
  "ownerName": "Gerald Klass",
  "role": "owner",
  "phone": "(612) 555-1234",
  "email": "gerald@soulbowl.com",
  "evidenceDescription": "I am the registered owner. I can provide business license and utility bill."
}
```

---

## 5. Authentication & Authorization

### Authentication Flow

1. **Client-side:** User signs in via Google Sign-In (Firebase Auth). On web, this uses `signInWithPopup`; on native Capacitor, the native Firebase plugin obtains credentials which are then synced to the Firebase JS SDK.
2. **Token acquisition:** The web client calls `user.getIdToken()` to get a Firebase ID token. The Hono RPC client (`apps/web/src/lib/api.ts`) automatically injects this as `Authorization: Bearer <token>` on every request.
3. **Server-side verification:** The `authMiddleware` (at `apps/api/src/middleware/auth.ts`) extracts the Bearer token, verifies it with `auth.verifyIdToken(idToken)` (Firebase Admin SDK), and sets `c.var.user` to the `DecodedIdToken`.
4. **User document:** On first authenticated request to `/me`, the API upserts a user document in Firestore's `users` collection, copying `uid`, `email`, `displayName`, and `photoURL` from the decoded token and setting `userType: "user"`.

### User Types

```typescript
export type UserType = "user" | "business"
```

- **`user`** — standard consumer account. Created on first sign-in.
- **`business`** — account linked to exactly one claimed restaurant. Upgraded from `user` when a claim is approved.

**Authorization middleware pattern:**

```typescript
// Business owner check middleware (verifies ownership of specific restaurant)
const requireOwnership = createMiddleware<AppEnv>(async (c, next) => {
  const restaurantId = c.req.param("id")
  const userDoc = await db.collection("users").doc(c.var.user.uid).get()
  if (userDoc.data()?.claimedRestaurantId !== restaurantId) {
    throw new HTTPException(403, { message: "Not the owner of this restaurant" })
  }
  await next()
})
```

### Access Matrix

| Action | Public | User | Business Owner |
|--------|--------|------|----------------|
| Browse/search restaurants | Yes | Yes | Yes |
| View restaurant details | Yes | Yes | Yes |
| View values list | Yes | Yes | Yes |
| Submit community report | — | Yes | Yes |
| Save favorites | — | Yes | Yes |
| Update own profile | — | Yes | Yes |
| Claim a restaurant | — | Yes | — |
| Update claimed restaurant values | — | — | Own only |
| Self-attest values | — | — | Own only |
| Upload verification docs | — | — | Own only |
