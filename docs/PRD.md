# Product Requirements Document (PRD)

## Punchline Atlas

**Version:** 3.0
**Last Updated:** February 24, 2026

---

## 1. Overview

### 1.1 Product Vision

Punchline Atlas is the nationwide comedy intelligence platform — discover venues, track comedian tours, rate shows, and never miss a night of comedy.

### 1.2 Target Users

| Persona | Description | Primary Goals |
|---------|-------------|---------------|
| **Comedy Fans** | Casual to dedicated fans seeking shows | Find shows near them, explore comedian profiles, plan nights out |
| **Venue Seekers** | People looking for comedy experiences in a location | Browse clubs, theaters, bars by location and type |
| **Tour Trackers** | Fans following specific comedians | Follow comedian schedules across cities and states |
| **Engaged Users** | Signed-in users who rate, review, and follow | Build a personal comedy profile, rate shows, earn badges |
| **Data Curators** | Internal ops or partners | Bulk import venues/events, sync YouTube channel stats |

### 1.3 Core Value Proposition

- **Centralized nationwide directory** of comedy venues with filtering and search
- **Comedian profiles** with touring status, genres, specials, and YouTube presence
- **National calendar** of upcoming shows with filtering by date and location
- **Interactive map** of comedy venues with clickable markers
- **User engagement** — follow comedians/venues, rate events, tier-rate comedians, earn badges
- **Privacy-first** — export data, delete account, GDPR-style requests, cookie consent

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL + Prisma ORM | Prisma 5.x |
| Auth | NextAuth.js (GitHub, Google OAuth, Credentials) | 4.x |
| Styling | Tailwind CSS | 3.x |
| Maps | Google Maps (`@react-google-maps/api`) | 2.x |
| APIs | YouTube Data API v3 | — |
| Unit Testing | Vitest + React Testing Library | 4.x |
| E2E Testing | Playwright | 1.x |
| PWA | `@ducanh2912/next-pwa` | 10.x |
| Deployment | Vercel (GitHub Actions CI/CD) | — |

---

## 3. Data Model

### 3.1 Core Entities

| Entity | Key Fields | Relations |
|--------|------------|-----------|
| **Venue** | name, address, city, state, lat/lng, capacity, type, website | photos, socialLinks, events, followers |
| **VenuePhoto** | url, caption, sortOrder | venue |
| **VenueSocialLink** | platform, url | venue |
| **Comedian** | name, slug, headshotUrl, bio, yearsActive, touringStatus, representation, website | genres, socialLinks, podcastLinks, specialReleases, youtubeChannel, followers, tierRatings |
| **ComedianGenre** | genre | comedian |
| **ComedianSocialLink** | platform, url | comedian |
| **ComedianPodcastLink** | podcastName, episodeUrl | comedian |
| **ComedianSpecial** | title, platform, releaseYear, url | comedian |
| **YouTubeChannel** | channelId, channelUrl, subscriberCount, videoCount, lastSyncedAt | comedian |
| **Event** | venueId, date, showtime, ticketUrl, priceMin/Max, showType, title | venue, comedians (EventComedian), reviews |
| **EventComedian** | eventId, comedianId, role (headline/feature/host) | event, comedian |
| **EventReview** | eventId, userId, rating (1–5), comment | event, user |

### 3.2 User System

| Entity | Key Fields | Relations |
|--------|------------|-----------|
| **User** | name, profileName, email, image, username, passwordHash | accounts, sessions, followsComedians, followsVenues, eventReviews, comedianTierRatings |
| **Account** | provider, providerAccountId, access_token | user |
| **Session** | sessionToken, expires | user |
| **VerificationToken** | identifier, token, expires | — |
| **ComedianFollow** | userId, comedianId | user, comedian |
| **VenueFollow** | userId, venueId | user, venue |
| **ComedianTierRating** | userId, comedianId, tier (S/A/B/C/D/F) | user, comedian |

### 3.3 Enums

| Enum | Values |
|------|--------|
| **VenueType** | CLUB, THEATER, BAR, FESTIVAL, OPEN_MIC |
| **TouringStatus** | TOURING, REGIONAL, LOCAL, RETIRED, UNKNOWN |
| **ShowType** | HEADLINE, FEATURE, OPEN_MIC, FESTIVAL, PODCAST_LIVE |

### 3.4 Key Indexes

- `Venue`: `[state, city]`, `[type]`
- `Event`: `[venueId]`, `[date]`
- `EventReview`: `[eventId]`, `@@unique([eventId, userId])`
- `ComedianFollow`: `@@unique([userId, comedianId])`
- `VenueFollow`: `@@unique([userId, venueId])`
- `ComedianTierRating`: `@@unique([userId, comedianId])`, `[comedianId]`

---

## 4. Application Routes

### 4.1 Public Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero section, quick-nav links, personalized "Made for you" feed (signed-in), upcoming shows, featured venues |
| `/search` | Search | Global full-text search across venues, comedians, events (min 2 chars) |
| `/venues` | Venues | Paginated venue directory with filters (state, city, type, name search) |
| `/venues/[id]` | Venue Detail | Full venue info: address, capacity, photos (lightbox gallery), social links, embedded Google Map, upcoming shows, follow button |
| `/comedians` | Comedians | Paginated comedian directory with filters (touring status, genre, name search) |
| `/comedians/[slug]` | Comedian Detail | Full profile with tabs (Info/Rate): bio, genres, specials, podcasts, YouTube stats, upcoming shows, follow button, badges, tier rating |
| `/schedule` | Schedule | National event calendar with date range, city, and state filters |
| `/events/[id]` | Event Detail | Event info: comedian(s), venue, date/showtime, pricing, ticket link, reviews section, social sharing, structured data |
| `/map` | Map | Interactive Google Maps with venue markers, info windows, cookie consent gating |
| `/auth/signin` | Sign In | OAuth sign-in (GitHub, Google) and credential login |
| `/auth/signup` | Sign Up | User registration with username/password |
| `/terms` | Terms of Service | Legal terms |
| `/privacy` | Privacy Policy | Privacy policy |

### 4.2 Authenticated Pages

| Route | Page | Description |
|-------|------|-------------|
| `/profile` | Profile | Display name, profile image, badges earned, favorite comedians grid, saved venues grid, profile name editing |
| `/following` | Following | Manage followed comedians and venues with cards and inline unfollow |
| `/settings` | Settings | Profile name edit, data export (JSON download), account deletion, links to Terms/Privacy |

### 4.3 API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `*` | `/api/auth/[...nextauth]` | — | NextAuth handler (OAuth callbacks, session) |
| `POST` | `/api/auth/register` | Public | User registration (username/password) |
| `GET` | `/api/search` | Public | Global search endpoint |
| `POST` | `/api/follow/comedian/[id]` | Session | Toggle follow comedian |
| `POST` | `/api/follow/venue/[id]` | Session | Toggle follow venue |
| `GET` | `/api/events/[id]/reviews` | Public | List event reviews |
| `POST` | `/api/events/[id]/reviews` | Session | Submit/update review (upsert) |
| `GET` | `/api/events/[id]/reviews/stats` | Public | Rating statistics (avg, count) |
| `GET/POST` | `/api/comedians/[id]/tier-rating` | Session | Get/submit tier rating (S–F) |
| `PATCH` | `/api/user/profile` | Session | Update profileName |
| `GET` | `/api/user/export` | Session | Export user data as JSON (GDPR) |
| `DELETE` | `/api/user/delete` | Session | Delete account with cascade |
| `POST` | `/api/import` | API Key | Bulk import venues/events (JSON) |
| `POST` | `/api/youtube/sync` | API Key | Sync YouTube channel stats |
| `POST` | `/api/privacy` | — | GDPR: access, erasure, export requests |

---

## 5. Feature Requirements (All Use Cases)

### 5.1 Discovery & Browsing

#### UC-01: Discover Shows Near Me

**Actors:** Visitor, Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User finds comedy shows happening in their area within a specific time frame.

**Flow:**
1. User visits Home — sees hero, featured venues, upcoming shows, and (if signed in) personalized "Made for you" section
2. User navigates to Schedule
3. User applies filters: date range (default: next 30 days), city, state
4. User browses paginated event cards showing comedian(s), venue, date/time, show type, ticket link
5. User clicks event → Event Detail page
6. From Event Detail, user can navigate to Comedian profile, Venue detail, or external ticket link

**Acceptance Criteria:**
- [x] Schedule page loads with default 30-day date range
- [x] Filters (date, city, state) update results dynamically
- [x] Event cards display comedian names, venue, date, show type, ticket link
- [x] Event detail page shows full information with links
- [x] Pagination works correctly

---

#### UC-02: Browse Venues by Location and Type

**Actors:** Visitor, Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User explores comedy venues filtered by geography and venue type.

**Flow:**
1. User navigates to Venues
2. User applies filters: state dropdown, city text input, venue type (Club/Theater/Bar/Festival/Open Mic), name search
3. User browses paginated venue cards with photos, type badges, capacity, upcoming show counts
4. User optionally opens Map → sees markers with info windows; clicks marker to navigate
5. User clicks venue → Venue Detail (address, capacity, photo gallery, social links, embedded map, upcoming shows)
6. If signed in: user clicks Follow to save the venue

**Acceptance Criteria:**
- [x] Venues list loads with pagination
- [x] All four filters (state, city, type, name) work independently and together
- [x] Map shows markers for venues with lat/lng
- [x] Info windows display venue name and link to detail
- [x] Venue detail shows address, capacity, photos (lightbox), social links, upcoming events
- [x] Follow button toggles state for authenticated users

---

#### UC-03: Explore a Comedian's Profile

**Actors:** Visitor, Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User explores a comedian's full profile including bio, media, specials, and upcoming shows.

**Flow:**
1. User navigates to Comedians
2. User applies filters: touring status (Touring/Regional/Local/Retired/Unknown), genre dropdown, name search
3. User clicks comedian → Comedian Detail
4. **Info tab:** Bio, headshot, years active, genres (tags), social links, website, YouTube channel (subscriber/video counts), podcast links, special releases (title, platform, year), upcoming shows list
5. **Rate tab:** Tier rating form (S/A/B/C/D/F) for authenticated users
6. User sees badges (if applicable): "First time" (seen once), "Multiple rounds" (seen at 2+ shows, with count)
7. If signed in: user clicks Follow to save the comedian

**Acceptance Criteria:**
- [x] Comedian list with filters and search
- [x] Comedian detail shows all profile fields
- [x] Tabbed layout (Info/Rate) with accessible tab navigation
- [x] YouTube stats display subscriber and video counts
- [x] Specials, podcasts, social links all render correctly
- [x] Upcoming shows listed with links
- [x] Follow button works for authenticated users
- [x] Badges appear for users who have reviewed events with this comedian

---

#### UC-04: Search Across All Content

**Actors:** Visitor, Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User performs a global search to find venues, comedians, or events by keyword.

**Flow:**
1. User clicks "Search shows & venues" from Home or search icon in mobile nav
2. User types query (minimum 2 characters)
3. Search results display grouped by category: venues, comedians, events
4. User clicks result → navigates to detail page

**Acceptance Criteria:**
- [x] Search input accepts text with 2-character minimum
- [x] Results returned across venues, comedians, events
- [x] Results link to correct detail pages
- [x] Empty and no-result states handled gracefully

---

#### UC-05: Explore Venues on Interactive Map

**Actors:** Visitor, Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User views comedy venues on an interactive Google Map and clicks markers for details.

**Flow:**
1. User navigates to Map
2. If cookies not accepted: cookie consent banner appears; user accepts
3. Map loads with venue markers for all venues with lat/lng coordinates
4. Map auto-fits bounds to show all markers
5. User pans/zooms to explore
6. User clicks marker → info window shows venue name and link
7. User clicks link → Venue Detail page

**Acceptance Criteria:**
- [x] Cookie consent gates map loading
- [x] Map loads with markers for venues with coordinates
- [x] Auto-fit bounds on initial load
- [x] Info windows show venue name and navigation link
- [x] Loading and error states handled
- [x] Map filter bar available for filtering

---

### 5.2 User Engagement

#### UC-06: Sign In / Sign Up

**Actors:** Visitor | **Priority:** High | **Status:** ✅ Implemented

**Description:** User creates an account or signs in to access engagement features.

**Flow — OAuth:**
1. User clicks "Sign in" in navigation
2. User is redirected to Sign In page
3. User clicks "Continue with GitHub" or "Continue with Google"
4. User authorizes on OAuth provider
5. Callback creates/updates User, Account, Session
6. User is signed in; navigation shows profile dropdown

**Flow — Credentials:**
1. User navigates to Sign Up page
2. User enters username, email, password
3. System validates and creates user with bcrypt-hashed password
4. User can sign in with credentials on Sign In page

**Acceptance Criteria:**
- [x] Sign in page shows GitHub and Google OAuth options
- [x] Sign up page supports username/password registration
- [x] OAuth flow completes and creates session
- [x] Credential sign-in validates against hashed password
- [x] Session persists across pages
- [x] Navigation updates to show authenticated state with profile dropdown
- [x] Redirect to original page after sign in

---

#### UC-07: Follow Comedians and Venues

**Actors:** Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User follows favorite comedians and venues for easy access and personalized content.

**Flow:**
1. User is on Comedian Detail or Venue Detail page
2. User clicks Follow button
3. System toggles follow (add if not following, remove if following) with optimistic UI
4. User navigates to Following page
5. User sees card grids of followed comedians and venues
6. User can unfollow inline from the Following page
7. Followed entities also appear on Profile page

**Acceptance Criteria:**
- [x] Follow button toggles state with optimistic update
- [x] Unauthenticated users redirected to sign in
- [x] Following page shows card grids with headshots/photos
- [x] Inline unfollow available on Following page
- [x] Profile page shows followed entities
- [x] Follow state persists across sessions

---

#### UC-08: Rate and Review an Event

**Actors:** Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User rates and optionally reviews a comedy event they attended.

**Flow:**
1. User navigates to Event Detail page
2. User sees EventReviewsSection (rating form + existing reviews list)
3. User selects star rating (1–5) using accessible star buttons
4. User optionally enters a text comment
5. User submits review
6. System saves review (upsert: one review per user per event)
7. Rating statistics (average, count) update
8. User earns badges on comedian profiles: "First time" (first review for a comedian) or "Multiple rounds" (2+ events with same comedian)

**Acceptance Criteria:**
- [x] Rating form visible only for signed-in users
- [x] Star buttons have aria-labels for accessibility
- [x] One review per user per event (upsert on resubmit)
- [x] Review list displays all reviews with pagination
- [x] Rating stats (average, count) shown on event card and detail page
- [x] Badges computed from review history and displayed on comedian profiles

---

#### UC-09: Tier-Rate a Comedian

**Actors:** Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User assigns a tier rating (S/A/B/C/D/F) to a comedian to express overall opinion.

**Flow:**
1. User navigates to Comedian Detail page
2. User clicks the Rate tab
3. User sees ComedianTierRatingForm with tier options: S, A, B, C, D, F
4. User selects a tier
5. System saves rating (upsert: one tier rating per user per comedian)

**Acceptance Criteria:**
- [x] Tier rating form visible on Rate tab for signed-in users
- [x] One rating per user per comedian (upsert)
- [x] Selected tier persists and displays on return visits
- [x] API validates tier value

---

#### UC-10: View and Edit Profile

**Actors:** Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User views their profile and updates their display name.

**Flow:**
1. User navigates to Profile via navigation dropdown
2. User sees: display name (profileName or name), profile image (from OAuth), badges section (comedian badges earned), favorite comedians grid, saved venues grid
3. User navigates to Settings
4. User updates profileName
5. User saves; profile reflects new name

**Acceptance Criteria:**
- [x] Profile displays badges and followed entities in card grids
- [x] Settings allows profileName editing
- [x] Changes persist after save
- [x] Error states displayed inline

---

#### UC-11: View Personalized Feed ("Made for You")

**Actors:** Signed-in User | **Priority:** Medium | **Status:** ✅ Partially Implemented

**Description:** Signed-in users see a personalized section on the home page showing upcoming events from comedians and venues they follow.

**Flow:**
1. Signed-in user visits Home page
2. "Made for you" section appears with events from followed comedians and venues
3. User clicks event to view details

**Acceptance Criteria:**
- [x] "Made for you" section appears for authenticated users
- [x] Shows events from followed comedians and venues
- [ ] Notifications for new events (planned)

---

### 5.3 Event Features

#### UC-12: View Event Details

**Actors:** Visitor, Signed-in User | **Priority:** High | **Status:** ✅ Implemented

**Description:** User views complete details for a comedy event.

**Flow:**
1. User navigates to Event Detail page (from schedule, venue, comedian, or search)
2. User sees: event title (or comedian names), date and showtime, venue with link, comedian(s) with links, show type badge, pricing (min/max), ticket link (external), rating stats (average, count)
3. User sees reviews section with existing reviews
4. User can share event via social sharing buttons
5. If signed in: user can rate/review the event

**Acceptance Criteria:**
- [x] All event fields displayed correctly
- [x] Links to venue and comedian detail pages work
- [x] Ticket link opens external site
- [x] Show type displayed with appropriate badge
- [x] Pricing formatted correctly (range or single price)
- [x] Social sharing buttons functional
- [x] Schema.org Event structured data in page

---

#### UC-13: Share an Event

**Actors:** Visitor, Signed-in User | **Priority:** Low | **Status:** ✅ Implemented

**Description:** User shares an event on social media platforms.

**Flow:**
1. User is on Event Detail page
2. User clicks social sharing button (EventShareButtons component)
3. Share dialog opens for selected platform with event details pre-populated

**Acceptance Criteria:**
- [x] Share buttons visible on event detail page
- [x] Sharing includes event title, date, and URL

---

### 5.4 Privacy & Legal

#### UC-14: Export Personal Data

**Actors:** Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User exports all their personal data as a JSON file (GDPR right of access).

**Flow:**
1. User navigates to Settings
2. User clicks "Export my data"
3. System fetches all user data: profile info, followed comedians, followed venues, event reviews, tier ratings
4. User downloads JSON file

**Acceptance Criteria:**
- [x] Export returns valid JSON containing all user data
- [x] Includes profile, follows, reviews, and ratings
- [x] Download triggers automatically
- [x] In-page success/error feedback

---

#### UC-15: Delete Account

**Actors:** Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User permanently deletes their account and all associated data.

**Flow:**
1. User navigates to Settings
2. User clicks "Delete account"
3. System shows confirmation prompt
4. User confirms
5. System deletes user and cascades: accounts, sessions, follows, reviews, tier ratings
6. User is signed out and redirected

**Acceptance Criteria:**
- [x] Confirmation required before deletion
- [x] Cascade deletes all related data
- [x] User signed out after deletion
- [x] In-page feedback for errors

---

#### UC-16: Cookie Consent

**Actors:** Visitor, Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User is informed about cookies and can accept or reject them.

**Flow:**
1. User visits site for the first time
2. Cookie consent banner appears with role="dialog" and aria-label
3. User clicks Accept or Reject
4. Consent stored in localStorage
5. Google Maps loading is gated by cookie consent

**Acceptance Criteria:**
- [x] Banner appears on first visit
- [x] Accept/Reject buttons functional
- [x] Consent persists in localStorage
- [x] Maps gated by consent
- [x] Banner accessible (dialog role, aria-label)

---

#### UC-17: View Legal Pages

**Actors:** Visitor, Signed-in User | **Priority:** Low | **Status:** ✅ Implemented

**Description:** User views Terms of Service or Privacy Policy.

**Flow:**
1. User clicks Terms or Privacy link in footer or Settings
2. Respective legal page loads with full content

**Acceptance Criteria:**
- [x] Terms of Service page loads at `/terms`
- [x] Privacy Policy page loads at `/privacy`
- [x] Links available in footer and Settings

---

#### UC-18: GDPR Privacy Requests

**Actors:** Any | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** System supports GDPR-style privacy requests (access, erasure, export) via API.

**Flow:**
1. Request sent to `POST /api/privacy` with request type (access, erasure, export) and user identifier
2. System processes request according to type
3. Response returned with result

**Acceptance Criteria:**
- [x] Access request returns user data
- [x] Erasure request deletes user data
- [x] Export request returns downloadable data
- [x] API validates request type and parameters

---

### 5.5 Operations & Data Management

#### UC-19: Bulk Import Venues and Events

**Actors:** Ops/Admin | **Priority:** Low | **Status:** ✅ Implemented

**Description:** Admin imports or updates multiple venues and events from a JSON file.

**Flow — CLI:**
1. Admin prepares JSON file with venues and events in expected format
2. Admin runs: `npm run db:import -- venues-events.json`
3. System parses, validates, and upserts data
4. Summary returned (created, updated, errors)

**Flow — API:**
1. Admin sends `POST /api/import` with JSON body and `X-API-Key: <BULK_IMPORT_API_KEY>` header
2. System processes and returns summary

**Acceptance Criteria:**
- [x] CLI script imports from file
- [x] API endpoint accepts JSON with valid API key
- [x] Upsert logic (create or update existing)
- [x] Validation errors reported
- [x] Unauthorized requests rejected

---

#### UC-20: Sync YouTube Channel Stats

**Actors:** Ops/Admin | **Priority:** Low | **Status:** ✅ Implemented

**Description:** Admin refreshes YouTube subscriber and video counts for all linked comedian channels.

**Flow — CLI:**
1. Admin runs: `npm run db:sync-youtube`
2. System queries YouTube Data API v3 for each linked channel
3. System updates subscriberCount, videoCount, lastSyncedAt

**Flow — API:**
1. Admin sends `POST /api/youtube/sync` with API key
2. System processes sync and returns results

**Acceptance Criteria:**
- [x] Script syncs all YouTubeChannel records
- [x] API endpoint protected by `YOUTUBE_SYNC_API_KEY`
- [x] Comedian profiles show updated counts
- [x] lastSyncedAt timestamp updated

---

#### UC-21: Scrape and Import Comedian Data

**Actors:** Ops/Admin | **Priority:** Low | **Status:** ✅ Implemented

**Description:** Admin scrapes comedian data from external sources and imports into the database.

**Flow:**
1. Admin runs: `npm run scrape:jester` to scrape comedian data
2. Admin runs: `npm run db:import-jester` to import scraped data
3. System creates/updates comedian records

**Acceptance Criteria:**
- [x] Scraper produces valid data file
- [x] Import script creates comedian records with proper fields

---

### 5.6 SEO & Structured Data

#### UC-22: SEO-Optimized Pages

**Actors:** Search Engines | **Priority:** High | **Status:** ✅ Implemented

**Description:** All pages have proper SEO metadata for search engine visibility.

**Implementation:**
- Dynamic `<title>` tags with template: `%s | Punchline Atlas`
- Meta descriptions per page
- OpenGraph tags (title, description, images, URL)
- Twitter Card tags
- Canonical URLs
- Default OG image (`/og-default.png`)
- Keywords meta tag
- Robots meta (index, follow)

**Acceptance Criteria:**
- [x] Every page has unique title and description
- [x] OpenGraph and Twitter Card tags on all pages
- [x] Canonical URLs set
- [x] Default OG image configured
- [x] Sitemap generation (`/sitemap.xml`)
- [x] robots.txt (`/robots.txt`)

---

#### UC-23: Structured Data (JSON-LD)

**Actors:** Search Engines | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** Key pages include Schema.org structured data for rich search results.

**Implementation:**
- **Event pages:** Schema.org `Event` with name, date, location, performer, offers
- **Comedian pages:** Schema.org `Person` with name, description, URL, image
- **Venue pages:** Schema.org `Place` with name, address, geo coordinates

**Acceptance Criteria:**
- [x] StructuredData component renders valid JSON-LD
- [x] Event structured data includes all required fields
- [x] Person structured data for comedians
- [x] Place structured data for venues
- [x] Unit tests verify structured data output

---

### 5.7 Image & Media

#### UC-24: View Venue Photo Gallery

**Actors:** Visitor, Signed-in User | **Priority:** Medium | **Status:** ✅ Implemented

**Description:** User views venue photos in a lightbox gallery.

**Flow:**
1. User is on Venue Detail page
2. User sees photo grid of venue photos
3. User clicks photo → lightbox opens
4. User navigates between photos in lightbox
5. User closes lightbox to return to page

**Acceptance Criteria:**
- [x] Photo grid displays venue photos
- [x] Lightbox opens on click
- [x] Navigation between photos in lightbox
- [x] Close button/action to dismiss lightbox
- [x] Photos have captions where available

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Requirement | Implementation |
|-------------|---------------|
| Page load < 2s | Server-side rendering with Next.js App Router |
| Async map loading | Google Maps loaded dynamically after consent |
| Image optimization | `next/image` with responsive sizes |
| ISR/Revalidation | `revalidate = 60` on list pages for stale-while-revalidate |
| Code splitting | Dynamic imports for heavy components (Map) |
| Loading states | Suspense boundaries with skeleton fallbacks |
| Pagination | Server-side pagination to limit query size |

### 6.2 Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Skip to content | Skip link in root layout |
| Semantic HTML | Proper heading hierarchy, landmark elements (nav, main) |
| ARIA roles | tablist/tab/tabpanel, dialog, aria-expanded, aria-current |
| Keyboard navigation | Tab navigation, arrow keys for tabs, Escape to close menus |
| Screen reader support | sr-only labels, ARIA labels for buttons/inputs |
| Focus management | Focus states (ring styles), focus trap for mobile menu |

### 6.3 Responsive Design

| Requirement | Implementation |
|-------------|---------------|
| Mobile-first | Tailwind CSS mobile-first breakpoints (sm, md, lg) |
| Responsive grids | 1 col mobile → 2–5 cols desktop |
| Mobile nav | Hamburger menu with aria-expanded |
| Touch targets | Min 44px touch targets for interactive elements |
| Mobile search | Search icon navigates to `/search` on mobile |
| Sticky header | Fixed nav with backdrop blur |

### 6.4 Security

| Concern | Mitigation |
|---------|------------|
| SQL injection | Prisma parameterized queries |
| XSS | React escaping; no `dangerouslySetInnerHTML` for user content |
| CSRF | SameSite cookies; NextAuth OAuth state |
| Authentication | Session-based via `getServerSession()` on protected routes |
| API protection | `BULK_IMPORT_API_KEY`, `YOUTUBE_SYNC_API_KEY` for ops endpoints |
| Password storage | bcrypt hashing for credential accounts |
| Map data privacy | Cookie consent before loading Maps; no PII in markers |

### 6.5 Testing

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit tests | Vitest + React Testing Library | 20 test files (11 lib + 9 component) |
| E2E tests | Playwright (chromium, firefox, webkit) | 13 spec files covering critical paths |
| CI | GitHub Actions | Tests run on push/PR |

---

## 7. Component Inventory

### 7.1 Layout & Navigation

| Component | Purpose |
|-----------|---------|
| `Nav.tsx` | Main navigation with desktop/mobile views, session-aware dropdown |
| `Footer.tsx` | Site footer with links |
| `SessionProvider.tsx` | NextAuth session provider wrapper |

### 7.2 Search & Discovery

| Component | Purpose |
|-----------|---------|
| `SearchBar.tsx` | Search input with dropdown results |
| `SearchPageContent.tsx` | Full search results page content |
| `Pagination.tsx` | Reusable pagination controls with aria-labels |

### 7.3 Venues & Map

| Component | Purpose |
|-----------|---------|
| `VenueMap.tsx` | Google Maps integration for venue display |
| `MapPageContent.tsx` | Map page layout and content |
| `MapFilterBar.tsx` | Map filtering controls |
| `ImageGalleryLightbox.tsx` | Photo gallery with lightbox viewer |

### 7.4 Events

| Component | Purpose |
|-----------|---------|
| `EventShareButtons.tsx` | Social sharing buttons for events |
| `EventReviews.tsx` | Review list display with pagination |
| `EventReviewsSection.tsx` | Combined reviews section (form + list) |
| `EventRatingForm.tsx` | Star rating submission form |

### 7.5 Comedians

| Component | Purpose |
|-----------|---------|
| `ComedianBadges.tsx` | Badge display (First time, Multiple rounds) |
| `ComedianPageTabs.tsx` | Tabbed layout for comedian detail (Info/Rate) |
| `ComedianTierRatingForm.tsx` | Tier rating form (S/A/B/C/D/F) |

### 7.6 User Interaction

| Component | Purpose |
|-----------|---------|
| `FollowButton.tsx` | Follow/unfollow toggle with optimistic UI |
| `CookieConsent.tsx` | Cookie consent banner and provider |

### 7.7 SEO

| Component | Purpose |
|-----------|---------|
| `StructuredData.tsx` | JSON-LD structured data for Event, Person, Place |

---

## 8. Business Logic Library (`src/lib/`)

| Module | Purpose |
|--------|---------|
| `prisma.ts` | Prisma client singleton |
| `auth.ts` | NextAuth configuration (providers, callbacks, adapter) |
| `venues.ts` | Venue queries (list, get, search, filter by state/city/type) |
| `comedians.ts` | Comedian queries (list, get, search, filter by status/genre) |
| `events.ts` | Event queries (list, get, filter by date/location, user-specific feeds) |
| `search.ts` | Unified search across venues, comedians, events |
| `event-reviews.ts` | Review CRUD and statistics (average, count) |
| `badges.ts` | Badge calculation logic (first time, multiple rounds) |
| `youtube.ts` | YouTube Data API v3 integration for channel stats |
| `import.ts` | Bulk import/upsert utilities for venues and events |
| `format.ts` | Formatting helpers (dates, prices, etc.) |
| `constants.ts` | App constants (show types, labels, page sizes, etc.) |
| `user-export.ts` | GDPR data export (compile all user data to JSON) |

---

## 9. Scripts & Operational Tools

| Script | Command | Purpose |
|--------|---------|---------|
| Seed | `npm run db:seed` | Populate database with initial data |
| Push schema | `npm run db:push` | Push Prisma schema to database |
| Prisma Studio | `npm run db:studio` | Open Prisma Studio GUI |
| Bulk import | `npm run db:import -- <file>` | Import venues/events from JSON file |
| YouTube sync | `npm run db:sync-youtube` | Sync YouTube channel statistics |
| Jester scrape | `npm run scrape:jester` | Scrape comedian data from Jester |
| Jester import | `npm run db:import-jester` | Import scraped Jester comedian data |
| Production setup | `npm run db:prod:setup` | Push schema + seed (one-time setup) |

---

## 10. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL for auth redirects |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret |
| `GITHUB_ID` | Yes | GitHub OAuth app ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth app secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps API key (client-side) |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key |
| `BULK_IMPORT_API_KEY` | No | Protects `POST /api/import` |
| `YOUTUBE_SYNC_API_KEY` | No | Protects `POST /api/youtube/sync` |

---

## 11. Deployment & CI/CD

| Area | Implementation |
|------|----------------|
| Hosting | Vercel |
| Database | Vercel Postgres, Neon, or Supabase |
| CI | GitHub Actions (test on push/PR) |
| CD | Vercel auto-deploy on push to main |
| Build | `npm run build` (Next.js production build) |
| Migrations | `npm run db:push` or `prisma migrate deploy` |
| Domain | Custom domain via Vercel |

---

## 12. User Flow Diagrams

### 12.1 Discovery Flow
```
Home → Schedule → Filter (date/city/state) → Event Card → Event Detail
                                                            ├── Comedian Profile
                                                            ├── Venue Detail
                                                            └── Ticket Link (external)
```

### 12.2 Venue Exploration Flow
```
Home/Nav → Venues → Filter (state/city/type/name) → Venue Card → Venue Detail
                                                                    ├── Photo Gallery (lightbox)
                                                                    ├── Embedded Map
                                                                    ├── Upcoming Shows
                                                                    └── Follow (auth)
            └── Map → Markers → Info Window → Venue Detail
```

### 12.3 Comedian Exploration Flow
```
Home/Nav → Comedians → Filter (status/genre/name) → Comedian Card → Comedian Detail
                                                                       ├── Info Tab (bio, specials, YouTube, podcasts, shows)
                                                                       ├── Rate Tab (tier rating, auth)
                                                                       ├── Badges
                                                                       └── Follow (auth)
```

### 12.4 User Engagement Flow
```
Sign In (OAuth/Credentials) → Follow comedians/venues → Rate events → View profile/badges
                             → "Made for you" feed on Home
                             → Following page → Manage follows
                             → Settings → Export data / Delete account
```

---

## 13. Use Case Summary Matrix

| ID | Use Case | Actors | Priority | Status |
|----|----------|--------|----------|--------|
| UC-01 | Discover shows near me | Visitor, User | High | ✅ |
| UC-02 | Browse venues by location and type | Visitor, User | High | ✅ |
| UC-03 | Explore a comedian's profile | Visitor, User | High | ✅ |
| UC-04 | Search across all content | Visitor, User | High | ✅ |
| UC-05 | Explore venues on interactive map | Visitor, User | Medium | ✅ |
| UC-06 | Sign in / sign up | Visitor | High | ✅ |
| UC-07 | Follow comedians and venues | User | High | ✅ |
| UC-08 | Rate and review an event | User | High | ✅ |
| UC-09 | Tier-rate a comedian | User | Medium | ✅ |
| UC-10 | View and edit profile | User | Medium | ✅ |
| UC-11 | View personalized feed | User | Medium | ⚠️ Partial |
| UC-12 | View event details | Visitor, User | High | ✅ |
| UC-13 | Share an event | Visitor, User | Low | ✅ |
| UC-14 | Export personal data | User | Medium | ✅ |
| UC-15 | Delete account | User | Medium | ✅ |
| UC-16 | Cookie consent | Visitor, User | Medium | ✅ |
| UC-17 | View legal pages | Visitor, User | Low | ✅ |
| UC-18 | GDPR privacy requests | Any | Medium | ✅ |
| UC-19 | Bulk import venues and events | Ops | Low | ✅ |
| UC-20 | Sync YouTube channel stats | Ops | Low | ✅ |
| UC-21 | Scrape and import comedian data | Ops | Low | ✅ |
| UC-22 | SEO-optimized pages | Search Engines | High | ✅ |
| UC-23 | Structured data (JSON-LD) | Search Engines | Medium | ✅ |
| UC-24 | View venue photo gallery | Visitor, User | Medium | ✅ |

---

## 14. Roadmap

### Completed

| Version | Scope | Status |
|---------|-------|--------|
| v0.1 | Venues, comedians, schedule, map | ✅ |
| v0.2 | YouTube sync, bulk import, scraper | ✅ |
| v0.3 | User auth, follows, profile, reviews, badges, tier ratings | ✅ |
| v0.4 | Privacy (export, delete, GDPR API), Terms, Privacy, cookie consent | ✅ |

| v0.5 | Admin/CMS, content management, claims, image upload | ✅ |
| v0.6 | Notifications (in-app, email digest, push), activity feed | ✅ |
| v0.7 | Social features (lists, RSVP, waitlist, group planning, user follows) | ✅ |
| v0.8 | Monetization (Stripe subscriptions, promoted listings, ticket affiliates, ads) | ✅ |
| v0.9 | Discovery (trending, specials, podcasts, festivals, open mics, compare, scenes, wrapped) | ✅ |
| v1.0 | Creator tools (comedian/venue dashboards, analytics, verification), PWA, SEO, embed API | ✅ |

### Next Phases

See [docs/FEATURE-ROADMAP.md](./FEATURE-ROADMAP.md) for detailed competitive analysis and feature specifications.

| Version | Theme | Key Deliverables |
|---------|-------|-----------------|
| v1.1 | Native Ticketing & Commerce | Stripe-powered checkout, QR mobile tickets, inventory management, dynamic pricing, season passes |
| v1.2 | AI-Powered Discovery & Social Graph | Taste profiles, ML recommendations, location-radius alerts, "friends going" social proof, calendar sync |
| v1.3 | Creator Economy & Direct-to-Fan | Exclusive content, in-app video, fan tipping, merch storefronts, booking requests, press kits |
| v1.4 | Community & Live Experience | Discussion threads, venue check-ins, user-generated clips, live show chat, fan groups, expanded achievements |
| v2.0 | Marketplace & Industry Platform | Talent marketplace, venue CRM, industry analytics, multi-venue management, agent portal, API ecosystem |

---

## 15. Appendix

### A. File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Nav, Footer, providers, skip-to-content)
│   ├── page.tsx                # Home (hero, HomeSections with Suspense)
│   ├── HomeSections.tsx        # Made for you, upcoming shows, featured venues
│   ├── globals.css             # Global styles
│   ├── venues/page.tsx         # Venue listing
│   ├── venues/[id]/page.tsx    # Venue detail
│   ├── comedians/page.tsx      # Comedian listing
│   ├── comedians/[slug]/page.tsx # Comedian detail
│   ├── schedule/page.tsx       # National calendar
│   ├── events/[id]/page.tsx    # Event detail
│   ├── map/page.tsx            # Interactive map
│   ├── search/page.tsx         # Search
│   ├── auth/signin/page.tsx    # Sign in
│   ├── auth/signup/page.tsx    # Sign up
│   ├── profile/page.tsx        # User profile
│   ├── following/page.tsx      # Following management
│   ├── settings/page.tsx       # User settings
│   ├── terms/page.tsx          # Terms of Service
│   ├── privacy/page.tsx        # Privacy Policy
│   └── api/                    # 14 API routes
├── components/                 # 20 components + 9 test files
├── lib/                        # 13 modules + 11 test files
└── types/                      # TypeScript type extensions
```

### B. Testing Coverage

| Category | Files | Framework |
|----------|-------|-----------|
| Component unit tests | 9 test files | Vitest + React Testing Library |
| Library unit tests | 11 test files | Vitest |
| E2E tests | 13 spec files | Playwright (chromium, firefox, webkit) |

### C. PWA Configuration

- Service worker: `public/sw.js` + Workbox runtime
- PWA plugin: `@ducanh2912/next-pwa` in `next.config.js`
- App icon: `public/icon.svg`
