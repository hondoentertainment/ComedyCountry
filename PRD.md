# Product Requirements Document (PRD)

## Punchline Atlas

**Version:** 1.0  
**Last Updated:** February 21, 2025

---

## 1. Overview

### 1.1 Product Vision

Punchline Atlas is the nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.

### 1.2 Target Users

- **Comedy fans** — Find shows near them, explore comedian profiles, and plan nights out
- **Venue seekers** — Browse comedy clubs, theaters, and bars by location and type
- **Tour trackers** — Follow comedian schedules across cities and states

### 1.3 Core Value Proposition

- Centralized nationwide directory of comedy venues
- Comedian profiles with touring status, genres, and YouTube presence
- National calendar of upcoming shows with filtering by date and location
- Interactive map of comedy venues with clickable markers

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Styling | Tailwind CSS |
| Maps | Google Maps (via @react-google-maps/api) |
| APIs | YouTube Data API v3 (channel stats sync) |

---

## 3. Feature Requirements

### 3.1 Phase 1 — Core Discovery (Implemented)

#### Venues

| ID | Requirement | Status |
|----|-------------|--------|
| V1 | List venues with pagination | ✅ |
| V2 | Filter by state, city, venue type | ✅ |
| V3 | Search venues by name | ✅ |
| V4 | Venue detail page with address, capacity, photos, social links, upcoming events | ✅ |
| V5 | Venue types: Club, Theater, Bar, Festival, Open Mic | ✅ |

#### Comedians

| ID | Requirement | Status |
|----|-------------|--------|
| C1 | List comedians with pagination | ✅ |
| C2 | Filter by touring status, genre | ✅ |
| C3 | Search comedians by name | ✅ |
| C4 | Comedian detail page with bio, genres, specials, social links, YouTube channel | ✅ |
| C5 | Touring status: Touring, Regional, Local, Retired, Unknown | ✅ |

#### Schedule

| ID | Requirement | Status |
|----|-------------|--------|
| S1 | National calendar of upcoming events | ✅ |
| S2 | Filter by date range (default: next 30 days) | ✅ |
| S3 | Filter by city and state | ✅ |
| S4 | Event cards with comedian(s), venue, date/time, show type, ticket link | ✅ |
| S5 | Show types: Headline, Feature, Open Mic, Festival, Podcast Live | ✅ |

#### Map

| ID | Requirement | Status |
|----|-------------|--------|
| M1 | Interactive Google Map of venue locations | ✅ |
| M2 | Markers for venues with lat/lng | ✅ |
| M3 | Info window with venue name, link to detail page | ✅ |
| M4 | Auto-fit bounds when multiple venues | ✅ |

### 3.2 Phase 2 — Data Enrichment

| ID | Requirement | Status |
|----|-------------|--------|
| D1 | YouTube Data API integration for channel subscriber/video sync | ✅ Implemented |
| D2 | Bulk import/update for venues and events | ✅ Implemented |
| D3 | Admin or CMS for content management | 📋 Planned |

### 3.3 Phase 3 — User Engagement (Schema Ready)

| ID | Requirement | Status |
|----|-------------|--------|
| U1 | User model (email, name) | ✅ Schema only |
| U2 | Follow comedians | 📋 Planned |
| U3 | Follow venues | 📋 Planned |
| U4 | Personalized feed / notifications for followed artists | 📋 Planned |

---

## 4. Data Model Summary

### Core Entities

- **Venue** — name, address, city, state, lat/lng, capacity, type, website, photos, social links
- **VenuePhoto** — url, caption, sortOrder
- **VenueSocialLink** — platform (instagram, twitter, facebook, youtube), url

- **Comedian** — name, slug, headshot, bio, years active, touring status, website
- **ComedianGenre** — genre (dark, observational, absurdist, etc.)
- **ComedianSocialLink** — platform, url
- **ComedianPodcastLink** — podcast name, episode url
- **ComedianSpecial** — title, platform, release year, url
- **YouTubeChannel** — channelId, channelUrl, subscriberCount, videoCount

- **Event** — venue, date, showtime, ticket url, price range, show type, title
- **EventComedian** — event, comedian, role (headline, feature, host)

### User System (Phase 3)

- **User** — email, name
- **ComedianFollow** — user, comedian
- **VenueFollow** — user, venue

---

## 5. User Flows

### Discover a Show

1. User visits home page → sees recent venues and upcoming shows
2. Clicks **Schedule** → filters by date and/or location
3. Clicks event → sees venue detail
4. Clicks comedian → sees profile and other shows

### Find Venues in a City

1. User clicks **Venues** → filters by state, city, or type
2. Clicks **Map** → sees markers; clicks marker for venue info
3. Clicks venue link → venue detail with upcoming events

### Explore a Comedian

1. User clicks **Comedians** → filters by status or genre
2. Clicks comedian → profile with bio, genres, specials, YouTube
3. Scrolls to upcoming shows → can navigate to venue or schedule

---

## 6. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | Pages load in &lt; 2s; map loads asynchronously |
| SEO | Server-rendered pages with meta tags |
| Accessibility | Semantic HTML, sr-only labels on form inputs, focus states |
| Mobile | Responsive layout; touch-friendly map markers |

---

## 7. Roadmap

| Milestone | Scope |
|-----------|-------|
| **v0.1** | Venues, comedians, schedule, map |
| **v0.2** | YouTube sync, improved seed data ✅ |
| **v0.3** | User auth, follow comedians/venues |
| **v1.0** | Notifications, PWA, polish |

---

## 8. Appendix

### File Structure

```
src/
├── app/
│   ├── venues/          # Venue list + [id] detail
│   ├── comedians/       # Comedian list + [slug] detail
│   ├── schedule/        # National calendar
│   └── map/             # Google Map of venues
├── components/          # VenueMap, shared UI
└── lib/                 # venues, comedians, events, constants
```

### Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps JavaScript API key
- `YOUTUBE_API_KEY` — YouTube Data API v3 key (for channel stats sync)
- `BULK_IMPORT_API_KEY` — Optional; when set, POST /api/import requires this key in Authorization or X-API-Key header

### Scripts

| Command | Description |
|---------|--------------|
| `npm run db:sync-youtube` | Sync subscriber/video counts for comedian YouTube channels |
| `npm run db:import -- <file>` | Bulk import venues and events from JSON file |
