# Product Requirements Document (PRD)

## Punchline Atlas

**Version:** 2.0  
**Last Updated:** February 21, 2025

---

## 1. Overview

### 1.1 Product Vision

Punchline Atlas is the nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.

### 1.2 Target Users

| Persona | Description | Primary Goals |
|---------|-------------|---------------|
| **Comedy Fans** | Casual to dedicated fans seeking shows | Find shows near them, explore comedian profiles, plan nights out |
| **Venue Seekers** | People looking for comedy experiences in a location | Browse clubs, theaters, bars by location and type |
| **Tour Trackers** | Fans following specific comedians | Follow comedian schedules across cities and states |
| **Data Curators** | Internal ops or partners | Bulk import venues/events, sync YouTube channel stats |

### 1.3 Core Value Proposition

- **Centralized nationwide directory** of comedy venues with filtering and search
- **Comedian profiles** with touring status, genres, specials, and YouTube presence
- **National calendar** of upcoming shows with filtering by date and location
- **Interactive map** of comedy venues with clickable markers
- **User engagement** — follow comedians/venues, rate events, earn badges
- **Privacy-first** — export data, delete account, GDPR-style requests

---

## 2. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v4 (GitHub, Google OAuth) |
| Styling | Tailwind CSS |
| Maps | Google Maps (`@react-google-maps/api`) |
| APIs | YouTube Data API v3 (channel sync) |
| Testing | Playwright (E2E) |

---

## 3. Feature Requirements

### 3.1 Phase 1 — Core Discovery ✅ Implemented

#### Venues

| ID | Requirement | Status |
|----|-------------|--------|
| V1 | List venues with pagination | ✅ |
| V2 | Filter by state, city, venue type | ✅ |
| V3 | Search venues by name | ✅ |
| V4 | Venue detail page: address, capacity, photos, social links, upcoming events | ✅ |
| V5 | Venue types: Club, Theater, Bar, Festival, Open Mic | ✅ |
| V6 | Follow venue (authenticated) | ✅ |

#### Comedians

| ID | Requirement | Status |
|----|-------------|--------|
| C1 | List comedians with pagination | ✅ |
| C2 | Filter by touring status, genre | ✅ |
| C3 | Search comedians by name | ✅ |
| C4 | Comedian detail: bio, genres, specials, social links, YouTube, podcasts | ✅ |
| C5 | Touring status: Touring, Regional, Local, Retired, Unknown | ✅ |
| C6 | Follow comedian (authenticated) | ✅ |
| C7 | Badges: "First time", "Multiple rounds" | ✅ |

#### Schedule

| ID | Requirement | Status |
|----|-------------|--------|
| S1 | National calendar of upcoming events | ✅ |
| S2 | Filter by date range (default: next 30 days) | ✅ |
| S3 | Filter by city and state | ✅ |
| S4 | Event cards: comedian(s), venue, date/time, show type, ticket link | ✅ |
| S5 | Show types: Headline, Feature, Open Mic, Festival, Podcast Live | ✅ |
| S6 | Event reviews (rating 1–5, comment) | ✅ |

#### Map

| ID | Requirement | Status |
|----|-------------|--------|
| M1 | Interactive Google Map of venue locations | ✅ |
| M2 | Markers for venues with lat/lng | ✅ |
| M3 | Info window: venue name, link to detail page | ✅ |
| M4 | Auto-fit bounds when multiple venues | ✅ |
| M5 | Cookie consent gating for Maps | ✅ |

### 3.2 Phase 2 — Data Enrichment ✅ Implemented

| ID | Requirement | Status |
|----|-------------|--------|
| D1 | YouTube Data API integration for channel subscriber/video sync | ✅ |
| D2 | Bulk import/update for venues and events (JSON) | ✅ |
| D3 | Admin or CMS for content management | 📋 Planned |

### 3.3 Phase 3 — User Engagement ✅ Implemented

| ID | Requirement | Status |
|----|-------------|--------|
| U1 | User model (email, name, profileName, image) | ✅ |
| U2 | Follow comedians | ✅ |
| U3 | Follow venues | ✅ |
| U4 | Following page: followed comedians & venues | ✅ |
| U5 | Profile page: badges, followed entities | ✅ |
| U6 | Event rating and review | ✅ |
| U7 | Comedian badges (first time, multiple rounds) | ✅ |
| U8 | Settings: profile edit, export data, delete account | ✅ |
| U9 | Personalized feed / notifications | 📋 Planned |

### 3.4 Phase 4 — Privacy & Legal ✅ Implemented

| ID | Requirement | Status |
|----|-------------|--------|
| P1 | Terms of Service page | ✅ |
| P2 | Privacy Policy page | ✅ |
| P3 | Cookie banner and consent | ✅ |
| P4 | Data export (JSON) | ✅ |
| P5 | Account deletion | ✅ |
| P6 | GDPR-style privacy API (access, erasure, export) | ✅ |

---

## 4. Data Model Summary

### Core Entities

| Entity | Key Fields | Relations |
|--------|------------|-----------|
| **Venue** | name, address, city, state, lat/lng, capacity, type, website | photos, socialLinks, events, followers |
| **VenuePhoto** | url, caption, sortOrder | venue |
| **VenueSocialLink** | platform, url | venue |
| **Comedian** | name, slug, headshot, bio, yearsActive, touringStatus, website | genres, socialLinks, podcastLinks, specialReleases, youtubeChannel, followers |
| **ComedianGenre** | genre | comedian |
| **ComedianSocialLink** | platform, url | comedian |
| **ComedianPodcastLink** | podcastName, episodeUrl | comedian |
| **ComedianSpecial** | title, platform, releaseYear, url | comedian |
| **YouTubeChannel** | channelId, channelUrl, subscriberCount, videoCount | comedian |
| **Event** | venueId, date, showtime, ticketUrl, priceMin/Max, showType, title | venue, comedians (EventComedian), reviews |
| **EventComedian** | eventId, comedianId, role | event, comedian |
| **EventReview** | eventId, userId, rating (1–5), comment | event, user |

### User System

| Entity | Key Fields | Relations |
|--------|------------|-----------|
| **User** | name, profileName, email, image | accounts, sessions, followsComedians, followsVenues, eventReviews |
| **ComedianFollow** | userId, comedianId | user, comedian |
| **VenueFollow** | userId, venueId | user, venue |

---

## 5. User Flows (Summary)

- **Discover a show** — Home → Schedule → filter by date/location → Event → Venue/Comedian
- **Find venues** — Venues → filter → Map or Venue detail → Follow
- **Explore comedian** — Comedians → filter → Profile → Follow, badges, upcoming shows
- **User engagement** — Sign in → Follow comedians/venues → Profile/Settings → Rate events

---

## 6. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | Pages load in < 2s; map loads asynchronously; cookie consent gates Maps |
| SEO | Server-rendered pages with meta tags |
| Accessibility | Semantic HTML, sr-only labels, focus states |
| Mobile | Responsive layout; touch-friendly map markers |

---

## 7. Roadmap (Current vs Future)

| Milestone | Scope | Status |
|-----------|-------|--------|
| **v0.1** | Venues, comedians, schedule, map | ✅ |
| **v0.2** | YouTube sync, bulk import | ✅ |
| **v0.3** | User auth, follow comedians/venues, profile, reviews, badges | ✅ |
| **v0.4** | Privacy (export, delete, GDPR API), Terms, Privacy | ✅ |
| **v0.5** | Admin/CMS for content management | 📋 Planned |
| **v1.0** | Notifications, PWA, polish | 📋 Planned |

---

## 8. Appendix

### Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Home: recent venues, upcoming shows |
| `/venues` | Public | Venue list with filters |
| `/venues/[id]` | Public | Venue detail |
| `/comedians` | Public | Comedian list with filters |
| `/comedians/[slug]` | Public | Comedian detail |
| `/schedule` | Public | National calendar |
| `/events/[id]` | Public | Event detail + reviews |
| `/map` | Public | Interactive venue map |
| `/auth/signin` | Public | Sign in (GitHub, Google) |
| `/following` | Required | Followed comedians & venues |
| `/profile` | Required | User profile, badges |
| `/settings` | Required | Account settings |
| `/terms` | Public | Terms of Service |
| `/privacy` | Public | Privacy Policy |

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL for auth redirects |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret |
| `GITHUB_ID` | Yes | GitHub OAuth app ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth app secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 |
| `BULK_IMPORT_API_KEY` | No | Protects POST `/api/import` |
| `YOUTUBE_SYNC_API_KEY` | No | Protects POST `/api/youtube/sync` |
