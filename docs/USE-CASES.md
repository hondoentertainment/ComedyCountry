# Use Cases — Top Use Cases Showcase

## Punchline Atlas

**Version:** 1.0  
**Last Updated:** February 21, 2025

---

## 1. Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Unauthenticated user browsing the site |
| **Signed-in User** | Authenticated user (GitHub or Google OAuth) |
| **Ops/Admin** | Internal or partner using bulk import, YouTube sync |

---

## 2. Top Use Cases

---

### UC-01: Discover a Show Near Me

**Actor:** Visitor, Signed-in User  
**Priority:** High  
**Status:** ✅ Implemented

#### Description
User wants to find comedy shows happening near them within a specific time frame.

#### Preconditions
- User has internet access
- App has events in the database

#### Flow

1. User visits **Home** → sees recent venues and upcoming shows
2. User navigates to **Schedule**
3. User applies filters:
   - **Date range** (default: next 30 days)
   - **City** and/or **State**
4. User sees paginated list of event cards (comedian(s), venue, date/time, ticket link)
5. User clicks an event → **Event detail** page
6. User can:
   - Click comedian → **Comedian profile**
   - Click venue → **Venue detail**
   - Click ticket link → external ticketing site

#### Postconditions
- User has found relevant shows and can plan attendance

#### Acceptance Criteria
- [x] Schedule page loads with default date range
- [x] Filters (date, city, state) work correctly
- [x] Event cards show comedian(s), venue, date, ticket link
- [x] Event detail page loads with full info
- [x] Navigation to comedian and venue works

---

### UC-02: Find Comedy Venues in a City

**Actor:** Visitor, Signed-in User  
**Priority:** High  
**Status:** ✅ Implemented

#### Description
User wants to browse comedy venues in a specific location (state, city) or by venue type.

#### Preconditions
- User has internet access
- App has venues with location data

#### Flow

1. User navigates to **Venues**
2. User applies filters:
   - **State**
   - **City**
   - **Venue type** (Club, Theater, Bar, Festival, Open Mic)
   - **Search** by venue name
3. User sees paginated list of venues
4. User optionally opens **Map** → sees markers; clicks marker for info window
5. User clicks venue → **Venue detail** (address, capacity, photos, social links, upcoming shows)
6. If signed in: user can **Follow** venue

#### Postconditions
- User has a list of venues matching criteria
- User may have followed a venue

#### Acceptance Criteria
- [x] Venues list loads with pagination
- [x] Filters (state, city, type, search) work
- [x] Map shows markers; info window links to venue detail
- [x] Venue detail shows address, capacity, photos, upcoming events
- [x] Follow button works when signed in

---

### UC-03: Explore a Comedian's Profile

**Actor:** Visitor, Signed-in User  
**Priority:** High  
**Status:** ✅ Implemented

#### Description
User wants to learn about a comedian and see their upcoming shows.

#### Preconditions
- User has internet access
- Comedian exists in database

#### Flow

1. User navigates to **Comedians**
2. User applies filters:
   - **Touring status** (Touring, Regional, Local, etc.)
   - **Genre**
   - **Search** by name
3. User clicks comedian → **Comedian detail**
4. User sees:
   - Bio, headshot, years active
   - Genres, social links, podcasts, specials
   - YouTube channel (subscriber count, video count)
   - Upcoming shows
5. If signed in: user can **Follow** comedian
6. If user has rated events with this comedian: **badges** (First time, Multiple rounds)

#### Postconditions
- User has full comedian context
- User may have followed the comedian

#### Acceptance Criteria
- [x] Comedians list with filters and search
- [x] Comedian detail shows bio, genres, specials, YouTube, upcoming shows
- [x] Follow button works when signed in
- [x] Badges appear for users who have rated events with this comedian

---

### UC-04: Follow Comedians and Venues

**Actor:** Signed-in User  
**Priority:** High  
**Status:** ✅ Implemented

#### Description
User wants to keep track of favorite comedians and venues for easy access.

#### Preconditions
- User is signed in (GitHub or Google)

#### Flow

1. User is on **Comedian detail** or **Venue detail**
2. User clicks **Follow** button
3. System toggles follow (add if not following, remove if following)
4. User navigates to **Following** page
5. User sees lists of followed comedians and venues
6. User can click any item to go to detail page

#### Postconditions
- Follow state persisted; visible on Following and Profile

#### Acceptance Criteria
- [x] Follow button toggles state
- [x] Optimistic UI updates immediately
- [x] Following page shows followed comedians and venues
- [x] Profile page shows followed entities

---

### UC-05: Rate and Review an Event

**Actor:** Signed-in User  
**Priority:** High  
**Status:** ✅ Implemented

#### Description
User attended an event and wants to rate it and optionally leave a comment.

#### Preconditions
- User is signed in
- Event exists and is in the past (or review allowed for future)

#### Flow

1. User navigates to **Event detail**
2. User sees **EventReviewsSection** (rating form + existing reviews)
3. User selects rating (1–5 stars)
4. User optionally enters comment
5. User submits
6. System saves review; user sees confirmation
7. User earns **badges** on comedian profile if first time or multiple events with that comedian

#### Postconditions
- Event has one review per user (upsert)
- Rating stats updated
- User may have new badges on comedian profiles

#### Acceptance Criteria
- [x] Rating form visible when signed in
- [x] One review per user per event (upsert)
- [x] Review list and stats displayed
- [x] Badges computed from review history

---

### UC-06: View and Edit Profile

**Actor:** Signed-in User  
**Priority:** Medium  
**Status:** ✅ Implemented

#### Description
User wants to see their profile and optionally update their display name.

#### Preconditions
- User is signed in

#### Flow

1. User navigates to **Profile** (via nav dropdown or direct link)
2. User sees:
   - Display name (profileName or name)
   - Badges (e.g. First time, Multiple rounds)
   - Followed comedians and venues
3. User navigates to **Settings**
4. User updates **profileName** if desired
5. User saves
6. Profile reflects new name

#### Postconditions
- Profile displays current data
- Display name updated if changed

#### Acceptance Criteria
- [x] Profile shows badges and followed entities
- [x] Settings allows profileName edit
- [x] Changes persist

---

### UC-07: Export Data and Delete Account

**Actor:** Signed-in User  
**Priority:** Medium  
**Status:** ✅ Implemented

#### Description
User wants to export their data or delete their account (GDPR-style).

#### Preconditions
- User is signed in

#### Flow

**Export:**
1. User goes to **Settings**
2. User clicks **Export my data**
3. System fetches all user data (profile, follows, reviews)
4. User downloads JSON file

**Delete:**
1. User goes to **Settings**
2. User clicks **Delete account**
3. System shows confirmation
4. User confirms
5. System deletes user, accounts, sessions, follows, reviews
6. User is signed out

#### Postconditions
- Export: user has JSON copy of their data
- Delete: account and related data removed

#### Acceptance Criteria
- [x] Export returns valid JSON with user data
- [x] Delete removes user and cascades to follows/reviews
- [x] User signed out after delete

---

### UC-08: Use Interactive Map of Venues

**Actor:** Visitor, Signed-in User  
**Priority:** Medium  
**Status:** ✅ Implemented

#### Description
User wants to see comedy venues on a map and click markers for details.

#### Preconditions
- User has internet access
- Cookie consent accepted (or not required)
- Google Maps API key configured

#### Flow

1. User navigates to **Map**
2. If cookies not accepted: **Cookie banner** appears; user accepts
3. Map loads with venue markers
4. User pans/zooms; markers cluster or show individually
5. User clicks marker → **Info window** with venue name and link
6. User clicks link → **Venue detail**

#### Postconditions
- User has geographic view of venues

#### Acceptance Criteria
- [x] Map loads after consent (when gated)
- [x] Markers appear for venues with lat/lng
- [x] Info window shows venue name and link
- [x] Link navigates to venue detail

---

### UC-09: Sign In with OAuth

**Actor:** Visitor  
**Priority:** High  
**Status:** ✅ Implemented

#### Description
User wants to sign in to access following, profile, and reviews.

#### Preconditions
- User has GitHub and/or Google account

#### Flow

1. User clicks **Sign in** in nav
2. User is redirected to **Sign in** page
3. User clicks **Continue with GitHub** or **Continue with Google**
4. User authorizes on provider
5. Callback creates/updates User, Account, Session
6. User is signed in; nav shows profile dropdown

#### Postconditions
- User has active session
- Full access to authenticated features

#### Acceptance Criteria
- [x] Sign in page shows GitHub and Google options
- [x] OAuth flow completes
- [x] Session persists across pages

---

### UC-10: Bulk Import Venues and Events

**Actor:** Ops/Admin  
**Priority:** Low  
**Status:** ✅ Implemented

#### Description
Admin wants to add or update many venues and events from a JSON file.

#### Preconditions
- Admin has valid `BULK_IMPORT_API_KEY`
- JSON file matches expected format

#### Flow

1. Admin runs: `npm run db:import -- venues-events.json`
   - Or POST to `/api/import` with JSON body and `X-API-Key` header
2. System parses JSON, validates
3. System creates/updates venues and events
4. System returns summary (created, updated, errors)

#### Postconditions
- Database has new/updated venues and events

#### Acceptance Criteria
- [x] CLI script imports from file
- [x] API endpoint accepts JSON with API key
- [x] Errors reported for invalid data

---

### UC-11: Sync YouTube Channel Stats

**Actor:** Ops/Admin  
**Priority:** Low  
**Status:** ✅ Implemented

#### Description
Admin wants to refresh YouTube subscriber and video counts for comedian channels.

#### Preconditions
- `YOUTUBE_API_KEY` and optionally `YOUTUBE_SYNC_API_KEY` configured
- Comedians have YouTubeChannel records

#### Flow

1. Admin runs: `npm run db:sync-youtube`
   - Or POST to `/api/youtube/sync` with API key
2. System fetches channel stats from YouTube Data API v3
3. System updates YouTubeChannel records
4. Comedian profiles show updated counts

#### Postconditions
- YouTubeChannel records have current subscriberCount, videoCount

#### Acceptance Criteria
- [x] Script syncs all channels
- [x] API endpoint triggers sync when protected
- [x] Comedian detail shows updated counts

---

## 3. Use Case Summary Matrix

| ID | Use Case | Actor | Priority | Status |
|----|----------|-------|----------|--------|
| UC-01 | Discover a show near me | Visitor, User | High | ✅ |
| UC-02 | Find comedy venues in a city | Visitor, User | High | ✅ |
| UC-03 | Explore a comedian's profile | Visitor, User | High | ✅ |
| UC-04 | Follow comedians and venues | User | High | ✅ |
| UC-05 | Rate and review an event | User | High | ✅ |
| UC-06 | View and edit profile | User | Medium | ✅ |
| UC-07 | Export data and delete account | User | Medium | ✅ |
| UC-08 | Use interactive map of venues | Visitor, User | Medium | ✅ |
| UC-09 | Sign in with OAuth | Visitor | High | ✅ |
| UC-10 | Bulk import venues and events | Ops | Low | ✅ |
| UC-11 | Sync YouTube channel stats | Ops | Low | ✅ |

---

## 4. Future Use Cases (Planned)

| ID | Use Case | Actor | Priority | Status |
|----|----------|-------|----------|--------|
| UC-12 | Personalized feed (followed comedians/venues events) | User | High | 📋 Planned |
| UC-13 | Email notifications for new events | User | Medium | 📋 Planned |
| UC-14 | Admin CRUD for venues, comedians, events | Admin | Medium | 📋 Planned |
| UC-15 | PWA install and offline support | Visitor, User | Low | 📋 Planned |
