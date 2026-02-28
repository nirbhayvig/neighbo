# Neighbo Firestore — Document Structure

## 1. Collections Overview

| Collection | Purpose | Priority |
|------------|---------|----------|
| `users` | User accounts — consumers and business owners. Stores profile info, user type, and value preferences. | P0 |
| `restaurants` | Restaurant/bar listings. Stores only Neighbo-owned data: `googlePlaceId`, cached search fields, values, and certification state. Full details (address, hours, phone, etc.) come from Google Places API at runtime. | P0 |
| `values` | Canonical value categories (LGBTQ+ Friendly, Black-Owned, etc.). Small, rarely-changing reference collection. | P0 |
| `reports` | Community reports — a user reporting that a restaurant aligns with certain values. | P0 |
| `businessClaims` | Ownership claim requests from business users. | P0 |

**Subcollections (nested under parent documents):**

| Parent | Subcollection | Purpose |
|--------|---------------|---------|
| `users/{uid}` | `favorites` | User's favorited restaurant references |

---

## 2. Google Places API Data Strategy

Neighbo uses a **"cache minimal, fetch at runtime"** approach.

**Stored in Firestore** (data Neighbo owns — what makes Neighbo unique):
- `googlePlaceId` — required, links each listing to Google
- `name` — cached from Google for search and list display
- `location` GeoPoint — cached for geo queries and map pins
- `geohash` — computed from `location` for geo-range queries
- `city` — cached for city-filter queries
- All Neighbo-specific data: `values`, `valueSlugs`, `certTierMax`, `totalReportCount`, `claimedByUserId`, `claimStatus`, timestamps

**Fetched from Google Places API at runtime** (frontend calls on detail page open):
- Full address, phone, website, hours, price level
- Google reviews and ratings
- Photos (via photo references)
- Current open/closed status

**Rationale:** Firestore is the "values layer" on top of Google's commodity restaurant data. Caching `name`/`location`/`city` is necessary for search and geo queries. Everything else comes fresh from Google, avoiding data staleness and storage bloat.

---

## 3. Document Schemas

### 3.1 `users/{uid}`

The document ID is the Firebase Auth `uid`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | `string` | Yes | Firebase Auth UID (matches document ID) |
| `email` | `string` | Yes | User's email from Google Sign-In |
| `displayName` | `string \| null` | Yes | Display name from Google profile |
| `photoURL` | `string \| null` | Yes | Profile photo URL from Google |
| `userType` | `string` | Yes | One of: `"user"`, `"business"` |
| `valuePreferences` | `string[]` | Yes | Array of value slugs the user cares about (e.g., `["lgbtq-friendly", "black-owned"]`). Defaults to `[]`. |
| `claimedRestaurantId` | `string \| null` | Yes | Restaurant document ID this user owns. Only set for `business` users. Null otherwise. |
| `reportCount` | `number` | Yes | Total community reports submitted by this user. Denormalized for profile display. |
| `createdAt` | `Timestamp` | Yes | Firestore server timestamp at document creation |
| `updatedAt` | `Timestamp` | Yes | Firestore server timestamp, updated on every write |

**Example document (consumer):**
```json
{
  "uid": "abc123firebase",
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "userType": "user",
  "valuePreferences": ["lgbtq-friendly", "sustainable", "black-owned"],
  "claimedRestaurantId": null,
  "reportCount": 3,
  "createdAt": "2026-01-15T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z"
}
```

**Example document (business user):**
```json
{
  "uid": "biz456firebase",
  "email": "gerald@soulbowl.com",
  "displayName": "Gerald Klass",
  "photoURL": null,
  "userType": "business",
  "valuePreferences": [],
  "claimedRestaurantId": "rest_abc123",
  "reportCount": 0,
  "createdAt": "2026-02-01T00:00:00.000Z",
  "updatedAt": "2026-02-25T00:00:00.000Z"
}
```

#### Subcollection: `users/{uid}/favorites/{restaurantId}`

Document ID is the restaurant document ID (makes add/remove idempotent).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `restaurantId` | `string` | Yes | Reference to `restaurants/{id}` |
| `restaurantName` | `string` | Yes | Denormalized for list display without join |
| `restaurantCity` | `string` | Yes | Denormalized |
| `addedAt` | `Timestamp` | Yes | When the user favorited this restaurant |

**Example document (at `users/abc123/favorites/rest_xyz`):**
```json
{
  "restaurantId": "rest_xyz",
  "restaurantName": "Soul Bowl",
  "restaurantCity": "Minneapolis",
  "addedAt": "2026-02-20T10:30:00.000Z"
}
```

**Rationale for subcollection:** Favorites are queried per-user ("show me my favorites") and never cross-user. A subcollection avoids bloating the user document and allows cursor-based pagination.

---

### 3.2 `restaurants/{id}`

Auto-generated document ID (Firestore auto-ID). Only fields that Neighbo owns or needs for queries are stored here. All Google Places data is fetched at runtime by the frontend.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `googlePlaceId` | `string` | Yes | Google Places API place ID. Used by frontend to fetch full details at runtime. |
| `name` | `string` | Yes | Restaurant name. Cached from Google for search and list display. |
| `city` | `string` | Yes | City name (e.g., "Minneapolis", "St. Paul"). Cached for city-filter queries. |
| `location` | `GeoPoint` | Yes | Firestore GeoPoint (latitude, longitude). Cached for map display and proximity queries. |
| `geohash` | `string` | Yes | Geohash string (precision 9) for geo-range queries. Computed from `location` on write. |
| `values` | `map[]` | Yes | Array of value objects on this restaurant. Each: `{ slug: string, certTier: number, selfAttested: boolean, reportCount: number, verifiedAt: Timestamp \| null }` |
| `valueSlugs` | `string[]` | Yes | Flat array of value slugs (e.g., `["black-owned", "poc-owned"]`). Denormalized for `array-contains` queries. Kept in sync with `values`. |
| `certTierMax` | `number` | Yes | Highest certification tier across all values on this restaurant (1, 2, or 3). Denormalized for filtering/sorting. |
| `totalReportCount` | `number` | Yes | Total community reports across all values. Denormalized counter. |
| `claimedByUserId` | `string \| null` | No | UID of the business user who has claimed this listing. Null if unclaimed. |
| `claimStatus` | `string \| null` | No | One of: `"pending"`, `"approved"`, `"rejected"`, or null if never claimed. |
| `deletedAt` | `Timestamp \| null` | No | Soft-delete timestamp. Null means active. Queries filter `deletedAt == null`. |
| `createdAt` | `Timestamp` | Yes | Firestore server timestamp |
| `updatedAt` | `Timestamp` | Yes | Firestore server timestamp |

**Example document:**
```json
{
  "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "name": "Soul Bowl",
  "city": "Minneapolis",
  "location": { "_latitude": 44.9778, "_longitude": -93.2900 },
  "geohash": "9zvg5e8qk",
  "values": [
    {
      "slug": "black-owned",
      "certTier": 2,
      "selfAttested": false,
      "reportCount": 5,
      "verifiedAt": null
    },
    {
      "slug": "poc-owned",
      "certTier": 1,
      "selfAttested": false,
      "reportCount": 2,
      "verifiedAt": null
    }
  ],
  "valueSlugs": ["black-owned", "poc-owned"],
  "certTierMax": 2,
  "totalReportCount": 7,
  "claimedByUserId": null,
  "claimStatus": null,
  "deletedAt": null,
  "createdAt": "2026-01-15T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z"
}
```

---

### 3.3 `values/{slug}`

Document ID is the value slug (e.g., `"lgbtq-friendly"`).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | Yes | URL-safe identifier (matches document ID) |
| `label` | `string` | Yes | Human-readable label (e.g., "LGBTQ+ Friendly") |
| `description` | `string` | Yes | Short description of what this value means |
| `icon` | `string` | Yes | Icon identifier for UI (e.g., `"rainbow"`, `"leaf"`, `"fist"`) |
| `category` | `string` | Yes | Grouping category: `"identity"`, `"social-justice"`, `"labor"`, `"environment"`, `"ownership"`, `"accessibility"` |
| `restaurantCount` | `number` | Yes | How many restaurants have this value. Denormalized counter for display. |
| `sortOrder` | `number` | Yes | Display order in filter lists |
| `active` | `boolean` | Yes | Whether this value is currently active. Inactive values are hidden from filters but preserved on existing restaurants. |
| `createdAt` | `Timestamp` | Yes | Creation timestamp |
| `updatedAt` | `Timestamp` | Yes | Last update timestamp |

**Example document (at `values/lgbtq-friendly`):**
```json
{
  "slug": "lgbtq-friendly",
  "label": "LGBTQ+ Friendly",
  "description": "Welcoming and affirming to LGBTQ+ customers and employees",
  "icon": "rainbow",
  "category": "identity",
  "restaurantCount": 7,
  "sortOrder": 1,
  "active": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

**Initial values to seed:**

| Slug | Label | Category |
|------|-------|----------|
| `lgbtq-friendly` | LGBTQ+ Friendly | identity |
| `anti-ice` | Anti-ICE / Immigration Sanctuary | social-justice |
| `union` | Labor-Friendly / Union | labor |
| `sustainable` | Environmental / Sustainable | environment |
| `black-owned` | Black-Owned | ownership |
| `woman-owned` | Woman-Owned | ownership |
| `disability-friendly` | Disability-Friendly | accessibility |
| `indigenous-owned` | Indigenous-Owned | ownership |
| `immigrant-owned` | Immigrant-Owned | ownership |
| `worker-cooperative` | Worker Cooperative | labor |
| `poc-owned` | POC-Owned | ownership |

---

### 3.4 `reports/{reportId}`

Auto-generated document ID.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `restaurantId` | `string` | Yes | Reference to `restaurants/{id}` |
| `restaurantName` | `string` | Yes | Denormalized for display |
| `userId` | `string` | Yes | UID of the reporting user |
| `values` | `string[]` | Yes | Array of value slugs being reported (e.g., `["black-owned", "sustainable"]`) |
| `comment` | `string \| null` | No | Optional free-text comment (max 500 chars) |
| `status` | `string` | Yes | One of: `"active"`, `"withdrawn"`. Defaults to `"active"`. |
| `createdAt` | `Timestamp` | Yes | Report submission timestamp |

**Example document:**
```json
{
  "restaurantId": "rest_abc123",
  "restaurantName": "Soul Bowl",
  "userId": "user_xyz",
  "values": ["black-owned"],
  "comment": "Confirmed by speaking with the owner.",
  "status": "active",
  "createdAt": "2026-02-15T14:30:00.000Z"
}
```

**Rate limiting query:** To enforce one report per user per restaurant per 30 days, the API queries:
```
reports
  .where("userId", "==", currentUid)
  .where("restaurantId", "==", targetRestaurantId)
  .where("createdAt", ">=", thirtyDaysAgo)
  .limit(1)
```
This requires a composite index on `(userId, restaurantId, createdAt)`.

---

### 3.5 `businessClaims/{claimId}`

Auto-generated document ID.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `restaurantId` | `string` | Yes | Reference to `restaurants/{id}` |
| `restaurantName` | `string` | Yes | Denormalized |
| `userId` | `string` | Yes | UID of the claimant |
| `userEmail` | `string` | Yes | Claimant's email (from Firebase Auth) |
| `ownerName` | `string` | Yes | Name of the business owner/representative |
| `role` | `string` | Yes | Claimant's role: `"owner"`, `"manager"`, `"authorized-rep"` |
| `phone` | `string` | Yes | Contact phone for verification |
| `email` | `string` | Yes | Business contact email |
| `evidenceDescription` | `string` | No | Description of evidence the claimant can provide |
| `evidenceFileURLs` | `string[]` | No | URLs to uploaded verification documents in Firebase Storage |
| `status` | `string` | Yes | One of: `"pending"`, `"approved"`, `"rejected"` |
| `createdAt` | `Timestamp` | Yes | Submission timestamp |

**Example document:**
```json
{
  "restaurantId": "rest_abc123",
  "restaurantName": "Soul Bowl",
  "userId": "user_business1",
  "userEmail": "gerald@soulbowl.com",
  "ownerName": "Gerald Klass",
  "role": "owner",
  "phone": "(612) 555-1234",
  "email": "gerald@soulbowl.com",
  "evidenceDescription": "I am the registered owner. Can provide business license.",
  "evidenceFileURLs": [],
  "status": "pending",
  "createdAt": "2026-02-25T09:00:00.000Z"
}
```

---

## 4. Relationships & Denormalization Strategy

Firestore is a document database without joins. The design uses strategic denormalization to optimize for read-heavy access patterns.

### Reference Diagram

```
users/{uid}
  ├── favorites/{restaurantId}  (subcollection, doc ID = restaurant ID)
  └── claimedRestaurantId: restaurantId | null  (field reference, one per business user)

restaurants/{id}
  ├── values[].slug → values/{slug}  (embedded reference)
  └── claimedByUserId → users/{uid}  (field reference)

reports/{id}
  ├── restaurantId → restaurants/{id}
  └── userId → users/{uid}

businessClaims/{id}
  ├── restaurantId → restaurants/{id}
  └── userId → users/{uid}
```

### Denormalized Fields and Their Sources

| Denormalized Field | Lives On | Source Of Truth | Updated When |
|-------------------|----------|-----------------|--------------|
| `restaurantName` | reports, businessClaims, favorites | `restaurants/{id}.name` | Restaurant name updated |
| `restaurantCity` | `users/{uid}/favorites/{id}` | `restaurants/{id}.city` | Restaurant city updated |
| `valueSlugs` | restaurants | `restaurants/{id}.values[].slug` | Values array modified on restaurant |
| `certTierMax` | restaurants | `max(restaurants/{id}.values[].certTier)` | Any value's certTier changes |
| `totalReportCount` | restaurants | Count of active reports | Report created |
| `reportCount` | users | Count of user's reports | Report created/withdrawn |
| `restaurantCount` | values | Count of restaurants with this value | Restaurant values modified |

### Why Top-Level Collections for Reports

Reports are stored as a top-level collection (not as a subcollection of restaurants) because:

1. **Cross-restaurant queries are needed:** "Show me all reports by user X" requires querying across restaurants.
2. **Rate-limiting reports** requires querying by `(userId, restaurantId, createdAt)` which is simpler as a top-level collection query.

Favorites are a subcollection of users because they are only ever queried per-user.

---

## 5. Composite Indexes

Firestore automatically indexes single fields. The following composite indexes are required for multi-field queries.

### Required Composite Indexes

| Collection | Fields | Query Purpose |
|------------|--------|---------------|
| `restaurants` | `deletedAt ASC`, `valueSlugs ARRAY_CONTAINS`, `certTierMax DESC` | Filter by value + sort by cert tier (active restaurants only) |
| `restaurants` | `deletedAt ASC`, `valueSlugs ARRAY_CONTAINS`, `name ASC` | Filter by value + sort by name |
| `restaurants` | `deletedAt ASC`, `city ASC`, `valueSlugs ARRAY_CONTAINS` | Filter by city + value |
| `restaurants` | `deletedAt ASC`, `geohash ASC` | Geo-range query for nearby restaurants |
| `reports` | `userId ASC`, `restaurantId ASC`, `createdAt DESC` | Rate-limit check: user's recent reports for a restaurant |
| `reports` | `restaurantId ASC`, `status ASC`, `createdAt DESC` | List active reports for a restaurant |
| `businessClaims` | `userId ASC`, `status ASC` | User's claims |
| `businessClaims` | `restaurantId ASC`, `status ASC` | Claims for a specific restaurant |

### Geo-Query Strategy

Firestore does not natively support radius-based geo queries. The recommended approach:

1. **Geohash-based range queries:** Store a geohash string on each restaurant. For proximity searches, compute the geohash ranges that cover the desired radius and query with `>=` and `<=` on the geohash field.
2. **Library:** Use `geofire-common` (or similar) to compute geohash values and query bounds.
3. **Client-side filtering:** The geohash query returns a superset of results (a bounding box). The API performs a final Haversine distance calculation to filter to the exact radius and computes `distanceKm` for each result.

```
// Pseudocode for nearby query
const center = [lat, lng]
const radiusKm = 5
const bounds = geohashQueryBounds(center, radiusKm * 1000)

const promises = bounds.map(([start, end]) =>
  db.collection("restaurants")
    .where("deletedAt", "==", null)
    .orderBy("geohash")
    .startAt(start)
    .endAt(end)
    .get()
)
const snapshots = await Promise.all(promises)
// Merge, deduplicate, filter by exact distance, sort
```

### Multi-Value Filtering (AND Logic)

Firestore's `array-contains` only supports a single value per query. For AND logic across multiple values (e.g., "Black-Owned AND Sustainable"):

1. **Client-side intersection (recommended for MVP):** Query for the first (rarest) value using `array-contains`, then filter client-side for additional values. Works well when one value is highly selective. The Twin Cities dataset of ~500 listings is small enough that this approach is fast.
2. **Multiple queries + merge:** Execute parallel queries for each value and intersect the results in application code.

---

## 6. Security Considerations

### Public vs. Private Fields

| Collection | Public Fields (readable by any user) | Private Fields (restricted) |
|------------|--------------------------------------|----------------------------|
| `users` | `displayName`, `photoURL`, `userType`, `reportCount` | `email`, `valuePreferences`, `claimedRestaurantId` (self only) |
| `restaurants` | All fields | None |
| `values` | All fields | None |
| `reports` | Aggregated counts only (via API) | Individual reports with `userId` (self only) |
| `businessClaims` | None (not publicly accessible) | All fields (claimant only) |

### Firestore Security Rules

Since the API mediates all Firestore access (the frontend does not directly query Firestore — only Firebase Auth is used client-side), Firestore Security Rules should deny all client-side reads and writes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all client-side access. All reads/writes go through the API
    // which uses the Firebase Admin SDK (bypasses security rules).
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

All authorization logic is enforced in the Hono.js API middleware layer. This is the correct pattern because:

- The Admin SDK bypasses security rules entirely
- Authorization logic lives in one place (API middleware) rather than being split between rules and middleware
- Complex role checks (business owner of *this specific restaurant*) are straightforward in application code

### Data Privacy

- **User emails** are never exposed via public API responses
- **Report authors** are never exposed in public-facing aggregated report counts
- **Business claim details** (phone, email, evidence) are only visible to the claimant
