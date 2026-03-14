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

| Milestone | Scope | Status |
|-----------|-------|--------|
| **v0.1** | Venues, comedians, schedule, map | ✅ Complete |
| **v0.2** | YouTube sync, improved seed data | ✅ Complete |
| **v0.3** | User auth, follow comedians/venues, reviews, badges | ✅ Complete |
| **v0.4** | Privacy & legal (GDPR, cookie consent, data export) | ✅ Complete |
| **v0.5** | Admin CMS (CRUD for venues, comedians, events) | ✅ Complete |
| **v0.6** | Notifications & feed (in-app, email digests, push) | ✅ Complete |
| **v1.0** | PWA, SEO, accessibility, performance polish | ✅ Complete |
| **v1.1** | Native ticketing & commerce (Stripe checkout, QR tickets, inventory, season passes) | In Progress |
| **v1.2** | AI-powered discovery & social graph (taste profiles, smart recs, location alerts, friends going) | In Progress |
| **v1.3** | Creator economy & direct-to-fan (exclusive content, tipping, merch, booking, press kits) | In Progress |
| **v1.4** | Community & live experience (discussions, check-ins, UGC clips, live chat, fan clubs, polls) | In Progress |
| **v2.0** | Marketplace & industry platform (talent marketplace, venue CRM, analytics, agent portal, sponsorships, API ecosystem) | Planned |
| **v2.1** | Smart venue operations & POS (table mgmt, drink minimums, walk-ups, staff tools, POS integration) | Planned |
| **v2.2** | Short-form comedy & viral discovery (TikTok-style clips, algorithmic feed, duets, trending bits) | Planned |
| **v2.3** | Audience growth & marketing suite (SMS campaigns, retargeting, referrals, segmentation, influencer tools) | Planned |
| **v2.4** | Mobile native & accessibility (React Native, Wallet passes, ASL show tags, captioned shows, sensory-friendly) | Planned |
| **v2.5** | International expansion & localization (multi-language, multi-currency, global festivals, touring tools) | Planned |

---

## 8. Phase Details (v1.1+)

### 8.1 Phase v1.1 — Native Ticketing & Commerce

Own the transaction — move from affiliate links to native ticket sales.

| ID | Feature | Priority |
|---|---|---|
| T-01 | Native ticket checkout (Stripe-powered) | Critical |
| T-02 | Mobile tickets with QR codes | Critical |
| T-03 | Ticket inventory management (GA, VIP, early bird) | High |
| T-04 | Dynamic pricing & early bird tiers | Medium |
| T-05 | Season passes & multi-show bundles | Medium |
| T-06 | Ticket transfer & gifting | Low |
| T-07 | Refund & cancellation policies | High |
| T-08 | Post-purchase review prompts | Medium |

### 8.2 Phase v1.2 — AI Discovery & Social Graph

Personalization that drives repeat visits.

| ID | Feature | Priority |
|---|---|---|
| D-01 | Comedy taste profile (ML-derived from user signals) | Critical |
| D-02 | Smart recommendations engine (collaborative + content-based) | Critical |
| D-03 | Location-radius alerts | High |
| D-04 | "Friends going" social proof on event cards | High |
| D-05 | Friend finder & contacts sync | Medium |
| D-06 | 2-way calendar sync (Google, Apple, Outlook) | Medium |
| D-07 | "Happening tonight" location-aware feed | Medium |
| D-08 | Taste-match percentage scores on comedian profiles | Low |

### 8.3 Phase v1.3 — Creator Economy & Direct-to-Fan

Make ComedyCountry the comedian's home base.

| ID | Feature | Priority |
|---|---|---|
| CR-01 | Exclusive content feed (free + subscriber-gated) | Critical |
| CR-02 | In-app video player (upload + embeds) | Critical |
| CR-03 | Fan tipping / virtual gifts (Stripe Connect) | High |
| CR-04 | Merch storefront | High |
| CR-05 | Booking request system (venue → comedian) | High |
| CR-06 | Press kit / EPK generator | Medium |
| CR-07 | Setlist / material tracker (private comedian tool) | Medium |
| CR-08 | Unified revenue dashboard | Medium |

### 8.4 Phase v1.4 — Community & Live Experience

Build the comedy fan community.

| ID | Feature | Priority |
|---|---|---|
| CM-01 | Discussion threads (comedian, venue, event pages) | Critical |
| CM-02 | Venue check-ins with "X people here now" | High |
| CM-03 | User-generated clips (≤60s, moderated) | High |
| CM-04 | Live show chat (real-time, auto-created for 50+ RSVPs) | Medium |
| CM-05 | Comedy clubs / fan groups (public or invite-only) | Medium |
| CM-06 | Polls & predictions | Low |
| CM-07 | Comedy news feed (editorial + aggregated) | Low |
| CM-08 | Achievements system expansion | Medium |

### 8.5 Phase v2.0 — Marketplace & Industry Platform

Become the operating system for live comedy.

| ID | Feature | Priority |
|---|---|---|
| MK-01 | Talent marketplace (venues post dates, comedians apply) | Critical |
| MK-02 | Venue CRM & marketing automation | Critical |
| MK-03 | Industry analytics dashboard | High |
| MK-04 | Multi-venue management | High |
| MK-05 | Agent & manager portal | Medium |
| MK-06 | Sponsorship marketplace | Medium |
| MK-07 | API partner ecosystem (webhooks, developer platform) | Medium |
| MK-08 | Comedy scene reports (auto-generated quarterly) | Low |

### 8.6 Phase v2.1 — Smart Venue Operations & POS

Compete with Seat Engine & Ticket Fairy on venue-side tooling. Win the venue operator.

| ID | Feature | Priority |
|---|---|---|
| VO-01 | Table management & seating charts (interactive drag-and-drop) | Critical |
| VO-02 | Drink minimum enforcement (2-drink min per ticket type) | Critical |
| VO-03 | Walk-up & door sales kiosk mode (tablet-optimized POS) | Critical |
| VO-04 | Comp & VIP list management with approval workflows | High |
| VO-05 | Staff scheduling & role-based access (door, bar, manager) | High |
| VO-06 | POS integration bridge (Square, Toast, Clover) | High |
| VO-07 | Real-time venue capacity & fire marshal compliance tracker | Medium |
| VO-08 | Food & beverage menu management with pre-order | Medium |

### 8.7 Phase v2.2 — Short-Form Comedy & Viral Discovery

No competitor has this. Own the TikTok-of-comedy vertical.

| ID | Feature | Priority |
|---|---|---|
| SF-01 | Vertical short-form video feed (≤90s comedy clips) | Critical |
| SF-02 | Algorithmic discovery feed (engagement + taste signals) | Critical |
| SF-03 | Clip-to-profile attribution (every clip links to comedian page) | Critical |
| SF-04 | Duet / reaction videos (split-screen fan reactions) | High |
| SF-05 | Trending bits & sounds (comedy-specific trending system) | High |
| SF-06 | Show preview clips (venue/comedian can post 15s teasers) | High |
| SF-07 | Clip challenges (weekly comedy prompts) | Medium |
| SF-08 | Audio extraction & remix tools | Low |

### 8.8 Phase v2.3 — Audience Growth & Marketing Suite

Beat Seat Engine's marketing tools. Become the growth engine for comedy venues.

| ID | Feature | Priority |
|---|---|---|
| AG-01 | SMS campaign engine (Twilio-powered, opt-in compliant) | Critical |
| AG-02 | Audience segmentation (by taste, frequency, spend, location) | Critical |
| AG-03 | Referral program engine (refer-a-friend discounts) | High |
| AG-04 | Retargeting pixel management (Meta, Google Ads) | High |
| AG-05 | Automated post-show follow-up sequences | High |
| AG-06 | A/B testing for event listings & pricing | Medium |
| AG-07 | Influencer partnership matching (local comedy influencers) | Medium |
| AG-08 | Audience lookalike modeling for venue expansion | Low |

### 8.9 Phase v2.4 — Mobile Native & Accessibility

First comedy platform with true accessibility focus. Apple/Google Wallet native tickets.

| ID | Feature | Priority |
|---|---|---|
| MN-01 | React Native app shell (iOS + Android) | Critical |
| MN-02 | Apple Wallet & Google Wallet ticket passes | Critical |
| MN-03 | ASL-interpreted show tagging & discovery filter | Critical |
| MN-04 | Captioned/subtitled show discovery | High |
| MN-05 | Sensory-friendly show tags (low-volume, seated, etc.) | High |
| MN-06 | Offline mode with cached upcoming tickets & venue info | High |
| MN-07 | Haptic feedback for live show interactions | Medium |
| MN-08 | Voice-guided navigation for venue arrival | Low |

### 8.10 Phase v2.5 — International Expansion & Localization

No US comedy platform has gone global. Own international comedy discovery.

| ID | Feature | Priority |
|---|---|---|
| IE-01 | Multi-language support (i18n framework with 10+ languages) | Critical |
| IE-02 | Multi-currency pricing & payment (Stripe international) | Critical |
| IE-03 | International comedy scene pages (Edinburgh, Melbourne, Montreal, London) | Critical |
| IE-04 | Festival circuit tracker (Edinburgh Fringe, Just for Laughs, Melbourne Comedy Fest) | High |
| IE-05 | Touring comedian visa/work permit info hub | High |
| IE-06 | Regional comedy style taxonomy (UK panel, Aussie standup, Japanese manzai) | Medium |
| IE-07 | Cross-border ticket sales with currency conversion | Medium |
| IE-08 | Local promoter onboarding program | Low |

---

## 9. Appendix

### File Structure

```
src/
├── app/
│   ├── venues/          # Venue list + [id] detail
│   ├── comedians/       # Comedian list + [slug] detail
│   ├── schedule/        # National calendar
│   ├── map/             # Google Map of venues
│   ├── scenes/          # City comedy scenes
│   ├── admin/           # Admin CMS (CRUD)
│   ├── creator/         # Creator dashboard & tools
│   ├── venue-dashboard/ # Venue operator dashboard
│   ├── industry/        # Industry analytics
│   ├── marketplace/     # Talent marketplace
│   └── api/             # 98 API routes
├── components/          # 72 React components
├── lib/                 # 27 utility modules
└── test/                # Test setup & harness
```

### Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps JavaScript API key
- `YOUTUBE_API_KEY` — YouTube Data API v3 key (for channel stats sync)
- `BULK_IMPORT_API_KEY` — Optional; when set, POST /api/import requires this key in Authorization or X-API-Key header
- `YOUTUBE_SYNC_API_KEY` — Optional; when set, POST /api/youtube/sync requires this key in Authorization or X-API-Key header
- `NEXTAUTH_URL` — Production URL for NextAuth.js
- `NEXTAUTH_SECRET` — Random secret for session signing
- `GITHUB_ID` / `GITHUB_SECRET` — GitHub OAuth credentials
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe payments
- `STRIPE_PRICE_*` — Stripe subscription price IDs

### Scripts

| Command | Description |
|---------|--------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest, watch mode) |
| `npm run test:run` | Run unit tests (single run) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run db:sync-youtube` | Sync subscriber/video counts for comedian YouTube channels |
| `npm run db:import -- <file>` | Bulk import venues and events from JSON file |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:seed-all` | Comprehensive seed (all data) |
