# Requirements: Values-Based Restaurant Finder (Working Title)

**Project:** Values-Based Restaurant Finder — Find restaurants/bars aligned with your values
**Date:** 2026-02-28
**Status:** Draft — Ready for Review

---

## Project Overview

**Core Concept:** Mobile-first PWA/website to discover restaurants and bars based on values (LGBTQ+ friendly, anti-ICE, labor practices, environmental sustainability, etc.)

**Target Market:** Twin Cities (Minneapolis/St. Paul), Minnesota — first-mover opportunity
**Year 1 Targets:** 10K MAU, 500 listings, 100 certified businesses

**Business Model:** Non-profit (.org) with optional discount/incentive program

---

## Key Features & Specifications

### P0 — Must Have (MVP)

#### 1. Restaurant Listing & Discovery
- **Description:** Browse restaurants/bars with values tags
- **Values Supported:**
  - LGBTQ+ Friendly
  - Anti-ICE / Immigration Sanctuary
  - Labor-friendly / Union
  - Environmental / Sustainable
  - Black-owned
  - Woman-owned
  - Disability-friendly
- **User Story:** "As a user, I want to filter restaurants by values I care about so I can make informed choices about where to eat."
- **Acceptance Criteria:**
  - [ ] List view shows restaurants with value badges
  - [ ] Filter by single or multiple values (AND logic)
  - [ ] Search by name, cuisine, or location
  - [ ] Results show within 2 seconds of filter change

#### 2. Google Maps Integration
- **Description:** Mobile-first map interface showing restaurant locations
- **User Story:** "As a user, I want to see restaurants on a map so I can find ones near me."
- **Acceptance Criteria:**
  - [ ] Map displays with restaurant pins
  - [ ] Tapping pin shows mini-card with name, values, distance
  - [ ] Tapping card navigates to full listing
  - [ ] "Near me" uses device geolocation
  - [ ] Map works offline with cached data (PWA)

#### 3. Restaurant Detail Page
- **Description:** Full info page for each restaurant
- **User Story:** "As a user, I want to see all details about a restaurant including its values and reviews."
- **Acceptance Criteria:**
  - [ ] Name, address, hours, phone, website displayed
  - [ ] Values badges clearly visible
  - [ ] Certification tier indicator (self-attested, community-vetted, verified)
  - [ ] Photos gallery (user-uploaded)
  - [ ] Directions link (opens Google Maps)
  - [ ] Share button

#### 4. Restaurant Certification System (Tiered)
- **Description:** Three-tier verification system
  - **Tier 1 - Self-Attested:** Business claims values via form
  - **Tier 2 - Community-Vetted:** 3+ community reports confirm claim
  - **Tier 3 - Verified:** Documentation reviewed by moderators
- **User Story:** "As a user, I want to know how trusted a restaurant's values claim is."
- **Acceptance Criteria:**
  - [ ] Tier badge visible on all listings
  - [ ] Tier 2 threshold is 3+ independent reports
  - [ ] Tier 3 requires moderator approval with evidence
  - [ ] Downgrade path if reports become contested

#### 5. Community Reporting System
- **Description:** Users report values alignment for restaurants
- **User Story:** "As a user, I want to report when a restaurant supports a value so others can know."
- **Acceptance Criteria:**
  - [ ] "Report this restaurant" button on detail page
  - [ ] Select values being reported (checkboxes)
  - [ ] Optional comment field (500 char max)
  - [ ] One report per user per restaurant per month
  - [ ] Reports stored with timestamp and user ID (if logged in)
  - [ ] Public counter shows total reports per value

---

### P1 — Important (Post-MVP)

#### 6. Reviews System
- **Description:** User reviews with values focus
- **User Story:** "As a user, I want to read/write reviews that mention values alignment."
- **Acceptance Criteria:**
  - [ ] 5-star rating (overall)
  - [ ] Values-specific ratings (optional, per value)
  - [ ] Text review (min 50 chars)
  - [ ] Sort by: newest, highest rated, most helpful
  - [ ] Report inappropriate reviews
  - [ ] Anonymity option

#### 7. Discount/Incentive Program
- **Description:** Businesses offer $1-2 off meals for certified values
- **User Story:** "As a user, I want to get discounts at values-aligned restaurants."
- **Acceptance Criteria:**
  - [ ] Discount amount displayed on listing
  - [ ] "Redeem" button shows code or instructions
  - [ ] Business dashboard to set/update offers
  - [ ] Redemption tracking (optional)
  - [ ] Expiration dates for offers

#### 8. News/Publications Overlay
- **Description:** Articles about restaurants from friendly sources
- **User Story:** "As a user, I want to see news about restaurants from trusted sources."
- **Acceptance Criteria:**
  - [ ] "News" tab on restaurant detail page
  - [ ] Aggregated from defined friendly sources
  - [ ] Headline, source, date displayed
  - [ ] Links to full article (external)
  - [ ] Manual curation + RSS feeds

#### 9. User Accounts
- **Description:** Account system for saving, reporting, reviewing
- **User Story:** "As a user, I want an account to save favorites and contribute."
- **Acceptance Criteria:**
  - [ ] Email/password signup and login
  - [ ] "Favorites" saved list
  - [ ] Contribution history (reports, reviews)
  - [ ] Optional: social login (Google)

---

### P2 — Nice to Have

#### 10. Social Media Integration
- **Description:** Share listings and discoveries
- **Acceptance Criteria:**
  - [ ] Share to Twitter/X, Facebook, Instagram Stories
  - [ ] Shareable links with preview image
  - [ ] "Invite friends" feature

#### 11. Business Dashboard
- **Description:** Restaurants manage their own listing
- **Acceptance Criteria:**
  - [ ] Claim listing ownership
  - [ ] Update info, hours, photos
  - [ ] Respond to reviews
  - [ ] Manage discount offers
  - [ ] Upload verification docs for Tier 3

#### 12. Push Notifications
- **Description:** Alerts for nearby certified restaurants
- **Acceptance Criteria:**
  - [ ] Opt-in notifications
  - [ ] "You're near [Restaurant]" alerts
  - [ ] New review alerts for favorites

---

## Technical Assumptions

| Assumption | Notes |
|------------|-------|
| PWA approach | Single-page app with service worker for offline |
| Google Maps API | Need API key, budget for ~10K map loads/month |
| Supabase | Auth, Database, Storage for photos |
| Mobile-first | Design for 375px width first, then scale up |
| Twin Cities focus | Initial data seeding for Minneapolis/St. Paul |
| Non-profit model | No ads,可能的 grants/donations |

---

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Google Maps API costs | Implement caching, limit API calls, consider Mapbox alternative |
| Fake reviews/reports | Tiered system, rate limiting, moderator queue |
| Legal liability | Clear disclaimers, tiered verification emphasizes trust levels |
| Moderation costs | Community-driven + threshold automation, volunteers |
| Verification burden | Tiered system reduces pressure on Tier 3 |

---

## MVP Scope (First Release)

**What ships:**
- P0 Features 1-5 (Listing, Map, Detail, Certification, Reporting)
- Basic user account (email signup)
- 100 initial restaurant listings (seeded data)

**What doesn't ship:**
- Reviews (P1)
- Discounts (P1)
- News overlay (P1)
- Business dashboard (P2)
- notifications (P2)

---

## Open Push Questions

1. **Naming:** Final app name? (Working title: "ValuesEats" or similar)
2. **Verification evidence:** What documentation required for Tier 3?
3. **Content moderation:** Who handles flagged reviews/reports?
4. **Data sources:** Initial listings from scraping, partnerships, or manual entry?
5. **Funding:** Non-profit status filing timeline?

---

## Next Steps

- [ ] Review this document with stakeholders
- [ ] Confirm naming and brand direction
- [ ] Approve MVP scope
- [ ] Hand off to engineering for architecture decisions
- [ ] Define verification evidence requirements for Tier 3

