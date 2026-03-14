# Implementation Plan

## Punchline Atlas

**Version:** 1.0  
**Last Updated:** February 21, 2025

---

## 1. Overview

This document outlines the implementation phases, task breakdown, dependencies, and recommended sequencing for Punchline Atlas. Current implementation status is Phase 1–4 complete; remaining work focuses on Admin/CMS, notifications, and v1.0 polish.

---

## 2. Implementation Phases

### Phase 1 — Core Discovery ✅ **COMPLETE**

**Goal:** Ship a minimum viable product for discovering venues, comedians, and events.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P1.1 | Set up Next.js 14, Prisma, PostgreSQL | — | ✅ |
| P1.2 | Define Prisma schema (Venue, Comedian, Event, relations) | P1.1 | ✅ |
| P1.3 | Seed script for initial data | P1.2 | ✅ |
| P1.4 | Venues list page + filters (state, city, type, search) | P1.2 | ✅ |
| P1.5 | Venue detail page | P1.4 | ✅ |
| P1.6 | Comedians list page + filters (touring status, genre, search) | P1.2 | ✅ |
| P1.7 | Comedian detail page | P1.6 | ✅ |
| P1.8 | Schedule page (events) + filters (date, city, state) | P1.2 | ✅ |
| P1.9 | Event detail page | P1.8 | ✅ |
| P1.10 | Map page with Google Maps, venue markers | P1.2 | ✅ |
| P1.11 | Home page: recent venues, upcoming shows | P1.4, P1.8 | ✅ |

**Deliverable:** Public-facing app for browsing venues, comedians, and events with an interactive map.

---

### Phase 2 — Data Enrichment ✅ **COMPLETE**

**Goal:** Improve data quality and operational tooling.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P2.1 | YouTube Data API integration | Phase 1 | ✅ |
| P2.2 | `YouTubeChannel` model + sync script | P2.1 | ✅ |
| P2.3 | Bulk import API (POST /api/import) | Phase 1 | ✅ |
| P2.4 | CLI script: `npm run db:import -- <file>` | P2.3 | ✅ |
| P2.5 | `npm run db:sync-youtube` script | P2.2 | ✅ |
| P2.6 | Jester comedian scraper + import | P2.3 | ✅ |

**Deliverable:** YouTube subscriber/video counts on comedian profiles; bulk import for venues and events.

---

### Phase 3 — User Engagement ✅ **COMPLETE**

**Goal:** Enable users to follow content and engage with events.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P3.1 | NextAuth.js setup (GitHub, Google) | Phase 1 | ✅ |
| P3.2 | User, Account, Session, ComedianFollow, VenueFollow models | P3.1 | ✅ |
| P3.3 | Follow comedian API (POST /api/follow/comedian/[id]) | P3.2 | ✅ |
| P3.4 | Follow venue API (POST /api/follow/venue/[id]) | P3.2 | ✅ |
| P3.5 | FollowButton component (optimistic UI) | P3.3, P3.4 | ✅ |
| P3.6 | Following page | P3.5 | ✅ |
| P3.7 | Profile page (badges, followed entities) | P3.6 | ✅ |
| P3.8 | EventReview model + API (GET/POST reviews) | Phase 1 | ✅ |
| P3.9 | EventRatingForm + EventReviewsSection | P3.8 | ✅ |
| P3.10 | Comedian badges (first time, multiple rounds) | P3.8 | ✅ |
| P3.11 | Settings page (profile edit, export, delete) | P3.2 | ✅ |

**Deliverable:** Signed-in users can follow comedians/venues, rate events, view profile with badges, and manage settings.

---

### Phase 4 — Privacy & Legal ✅ **COMPLETE**

**Goal:** Meet privacy and legal requirements.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P4.1 | Terms of Service page | — | ✅ |
| P4.2 | Privacy Policy page | — | ✅ |
| P4.3 | Cookie consent banner (localStorage) | — | ✅ |
| P4.4 | Map gated by cookie consent | P4.3 | ✅ |
| P4.5 | Data export API (GET /api/user/export) | P3.2 | ✅ |
| P4.6 | Account deletion API (DELETE /api/user/delete) | P3.2 | ✅ |
| P4.7 | Privacy API (POST /api/privacy) — access, erasure, export | P4.5, P4.6 | ✅ |

**Deliverable:** GDPR-style data handling, cookie consent, and legal pages.

---

### Phase 5 — Admin & CMS ✅ **COMPLETE**

**Goal:** Enable non-technical curators to manage content.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P5.1 | Admin auth (role field on User, requireAdmin middleware) | Phase 3 | ✅ |
| P5.2 | Admin dashboard layout (sidebar nav, stats cards) | P5.1 | ✅ |
| P5.3 | Venue CRUD (list, create, edit, delete) | P5.2 | ✅ |
| P5.4 | Comedian CRUD (list, create, edit, delete with genres) | P5.2 | ✅ |
| P5.5 | Event CRUD (list, create, edit, delete with comedian assignment) | P5.2 | ✅ |
| P5.6 | Admin nav link for admin users (desktop + mobile) | P5.1 | ✅ |
| P5.7 | Comprehensive seed data (2000 comedians, 150+ venues) | P5.3–P5.5 | ✅ |

**Deliverable:** Full admin CMS at `/admin` with CRUD for venues, comedians, and events. Role-based access control via `user.role` field.

---

### Phase 6 — Notifications & Feed ✅ **COMPLETE**

**Goal:** Notify users when followed comedians/venues have new events.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P6.1 | Notification + NotificationPreference models | Phase 3 | ✅ |
| P6.2 | In-app feed page with notifications list | P6.1 | ✅ |
| P6.3 | Notification API (list, mark read, unread count) | P6.1 | ✅ |
| P6.4 | Notification generation on event creation | P6.3 | ✅ |
| P6.5 | Notification bell in nav with unread badge | P6.3 | ✅ |
| P6.6 | User preference: in-app toggle + email digest (off/daily/weekly) | Phase 3 | ✅ |
| P6.7 | Push notifications (optional, PWA) | Phase 6 | 📋 Deferred |

**Deliverable:** In-app notification system with bell icon, feed page, auto-notifications when events are created for followed entities, and configurable notification preferences in settings.

---

### Phase 7 — v1.0 Polish ✅ **COMPLETE**

**Goal:** Production-ready experience.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P7.1 | PWA support (manifest, service worker) | Phase 1 | ✅ |
| P7.2 | Offline fallback for critical pages | P7.1 | ✅ |
| P7.3 | Performance audit (viewport, image priority, loading states) | — | ✅ |
| P7.4 | Image optimization (Next/Image with priority for LCP) | — | ✅ |
| P7.5 | SEO audit (meta, sitemap, robots.txt, structured data) | — | ✅ |
| P7.6 | Accessibility audit (skip links, focus traps, ARIA, semantic HTML) | — | ✅ |
| P7.7 | Loading skeletons for feed page | Phase 6 | ✅ |

**Deliverable:** Production-ready app with PWA support, comprehensive SEO, accessibility features, performance optimizations, and polished loading states.

---

### Phase 8 — Native Ticketing & Commerce (v1.1)

**Goal:** Own the ticket transaction — replace affiliate links with native checkout.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P8.1 | Stripe Connect setup for multi-party payments | Phase 7 | ✅ Partial |
| P8.2 | TicketType model (GA, VIP, early bird) with inventory | P8.1 | ✅ |
| P8.3 | Ticket purchase API (POST /api/tickets/purchase) | P8.2 | ✅ |
| P8.4 | TicketPurchaseWidget component | P8.3 | ✅ |
| P8.5 | QR code ticket generation + scan endpoint | P8.3 | ✅ |
| P8.6 | Season passes & bundles (SeasonPass model) | P8.2 | ✅ |
| P8.7 | Refund policy configuration per event | P8.3 | ✅ |
| P8.8 | Dynamic pricing / early bird tiers | P8.2 | ✅ |
| P8.9 | Ticket transfer & gifting flow | P8.3 | ✅ |
| P8.10 | Post-purchase review prompt (cron job) | P8.3 | ✅ |

**Deliverable:** Native ticket checkout with QR codes, inventory management, season passes, and refund policies.

---

### Phase 9 — AI Discovery & Social Graph (v1.2)

**Goal:** ML-powered taste matching and social proof to drive engagement.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P9.1 | TasteProfile model + computeTasteProfile engine | Phase 3 | ✅ |
| P9.2 | Smart recommendations (collaborative + content-based) | P9.1 | ✅ |
| P9.3 | Taste match scores on comedian profiles | P9.1 | ✅ |
| P9.4 | TasteMatchBadge component | P9.3 | ✅ |
| P9.5 | "Happening tonight" location-aware feed | P9.1 | ✅ |
| P9.6 | Location-radius alerts (LocationAlert model) | P9.5 | ✅ |
| P9.7 | Friends system (Friend model, requests) | Phase 3 | ✅ |
| P9.8 | "Friends going" badge on event cards | P9.7 | ✅ |
| P9.9 | 2-way calendar sync (Google, Apple, Outlook) | Phase 8 | ✅ |
| P9.10 | Friend finder & contacts sync | P9.7 | ✅ |

**Deliverable:** AI taste profiles, smart recommendations, location alerts, friends system, and social proof on events.

---

### Phase 10 — Creator Economy & Direct-to-Fan (v1.3)

**Goal:** Make ComedyCountry the comedian's home base with monetization tools.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P10.1 | CreatorContent model + exclusive content feed | Phase 3 | ✅ |
| P10.2 | ExclusiveContentFeed component | P10.1 | ✅ |
| P10.3 | Fan tipping / virtual gifts (TipButton, Stripe Connect) | Phase 8 | ✅ |
| P10.4 | Merch storefront (MerchItem model, creator/merch API) | P10.1 | ✅ |
| P10.5 | Booking request system (BookingRequest model) | Phase 5 | ✅ |
| P10.6 | Press kit / EPK generator | P10.1 | ✅ |
| P10.7 | Setlist / material tracker (private comedian tool) | P10.1 | ✅ |
| P10.8 | Unified revenue dashboard | P10.3, P10.4 | ✅ |
| P10.9 | In-app video player (upload + embeds) | P10.1 | ✅ |
| P10.10 | Creator analytics expansion | P10.8 | ✅ |

**Deliverable:** Exclusive content, tipping, merch, booking requests, press kits, setlist tracker, and revenue dashboard.

---

### Phase 11 — Community & Live Experience (v1.4)

**Goal:** Build the comedy fan community to keep users engaged between shows.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P11.1 | Discussion threads (Discussion model, threaded replies) | Phase 3 | ✅ |
| P11.2 | DiscussionSection component | P11.1 | ✅ |
| P11.3 | Venue check-ins (CheckIn model, "X here now") | Phase 3 | ✅ |
| P11.4 | User-generated clips (Clip model, moderation) | Phase 3 | ✅ |
| P11.5 | Live show chat (LiveChatWidget) | P11.1 | ✅ |
| P11.6 | Comedy clubs / fan groups (FanClub model) | Phase 3 | ✅ |
| P11.7 | Polls & predictions (Poll model, voting) | P11.6 | ✅ |
| P11.8 | Achievements system expansion | Phase 3 | ✅ |
| P11.9 | Content moderation pipeline (AI-powered) | P11.4 | ✅ |
| P11.10 | Comedy news feed (editorial + aggregated) | P11.1 | ✅ |

**Deliverable:** Discussion threads, check-ins, UGC clips, live chat, fan clubs, polls, and expanded achievements.

---

### Phase 12 — Marketplace & Industry Platform (v2.0)

**Goal:** Become the operating system for live comedy with B2B tools.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P12.1 | Talent marketplace (MarketplaceListing model) | Phase 10 | ✅ |
| P12.2 | Venue CRM & email campaigns (EmailCampaign model) | Phase 8 | ✅ |
| P12.3 | Industry analytics dashboard (IndustryReport model) | Phase 5 | ✅ |
| P12.4 | Agent & manager portal (AgentRoster model) | P12.1 | ✅ |
| P12.5 | Sponsorship marketplace (Sponsorship model) | P12.1 | ✅ |
| P12.6 | Developer API & keys (DeveloperKey model) | Phase 7 | ✅ |
| P12.7 | Multi-venue management (VenueGroup model) | P12.2 | ✅ |
| P12.8 | OpenAPI spec + embed API | P12.6 | ✅ |
| P12.9 | Webhook system for partners | P12.6 | ✅ |
| P12.10 | Auto-generated quarterly city reports | P12.3 | ✅ |

**Deliverable:** Talent marketplace, venue CRM, industry analytics, agent portal, sponsorships, and developer API.

---

### Phase 14 — Smart Venue Operations & POS (v2.1)

**Goal:** Win venue operators away from Seat Engine and Ticket Fairy with superior operations tooling.

**Competitive context:** Seat Engine offers 360-degree venue management, Ticket Fairy has drink minimum & POS integration, QuickTix wins on comp/VIP list management. ComedyCountry must match and exceed these to own the venue relationship.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P14.1 | TableLayout model + interactive seating chart editor | Phase 12 | ✅ |
| P14.2 | DrinkMinimum model tied to ticket types | Phase 8 | ✅ |
| P14.3 | Walk-up & door sales kiosk mode (tablet UI) | Phase 8 | ✅ |
| P14.4 | Comp & VIP list management API + approval workflows | Phase 12 | ✅ |
| P14.5 | Staff scheduling (StaffShift model, role-based access) | Phase 5 | ✅ |
| P14.6 | POS integration bridge (Square, Toast, Clover webhooks) | Phase 12 | ✅ |
| P14.7 | Real-time venue capacity tracker & fire marshal compliance | P14.1 | ✅ |
| P14.8 | F&B menu management with pre-order (MenuCategory, MenuItem) | P14.6 | ✅ |
| P14.9 | Venue ops lib + API routes + tests | P14.1–P14.8 | ✅ |
| P14.10 | Venue operations dashboard page | P14.9 | ✅ |

**Deliverable:** Full venue operations suite — table management, drink minimums, walk-up sales, staff scheduling, POS bridge, and capacity tracking.

---

### Phase 15 — Short-Form Comedy & Viral Discovery (v2.2)

**Goal:** Build the TikTok-of-comedy — no competitor has short-form algorithmic comedy discovery.

**Competitive context:** JumpComedy helps comedians grow audiences but has no video feed. Open Comedy has profiles but no discovery engine. Instagram/TikTok have comedy but no show-to-ticket conversion. ComedyCountry can own the clip-to-ticket pipeline.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P15.1 | ShortClip model (≤90s, comedian attribution, engagement metrics) | Phase 11 | ✅ |
| P15.2 | Vertical video feed UI (swipe-based, autoplay) | P15.1 | ✅ |
| P15.3 | Algorithmic feed engine (engagement signals + taste profile) | P15.1, Phase 9 | ✅ |
| P15.4 | Clip-to-profile attribution (every clip links to comedian + next show) | P15.1 | ✅ |
| P15.5 | Duet & reaction system (split-screen fan recordings) | P15.1 | ✅ |
| P15.6 | Trending bits & sounds (comedy-specific trending algorithm) | P15.3 | ✅ |
| P15.7 | Show preview clips (15s teaser from venue/comedian) | P15.1 | ✅ |
| P15.8 | Weekly clip challenges (comedy prompts) | P15.6 | ✅ |
| P15.9 | Short-form lib + API routes + tests | P15.1–P15.8 | ✅ |
| P15.10 | Clips discovery page & feed integration | P15.9 | ✅ |

**Deliverable:** TikTok-style comedy clip feed with algorithmic discovery, comedian attribution, duets, trending, and clip-to-ticket conversion.

---

### Phase 16 — Audience Growth & Marketing Suite (v2.3)

**Goal:** Become the growth engine venues can't live without — beat Seat Engine's email marketing with full-stack audience tools.

**Competitive context:** Seat Engine bundles email marketing with ticketing. Ticket Fairy offers social sharing & promotional tools. No competitor offers SMS, retargeting pixel management, referrals, or audience segmentation in a unified suite.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P16.1 | SMS campaign engine (SMSCampaign model, Twilio integration) | Phase 12 | ✅ |
| P16.2 | Audience segmentation engine (taste, frequency, spend, location) | Phase 9, 12 | ✅ |
| P16.3 | Referral program (ReferralCode model, discount generation) | Phase 8 | ✅ |
| P16.4 | Retargeting pixel management (Meta Pixel, Google Ads tag) | Phase 12 | ✅ |
| P16.5 | Automated post-show follow-up sequences | Phase 12 | ✅ |
| P16.6 | A/B testing for event listings & pricing (ABTest model) | Phase 8 | ✅ |
| P16.7 | Influencer partnership matching (local comedy influencers) | Phase 9 | ✅ |
| P16.8 | Audience lookalike modeling for venue expansion markets | P16.2 | ✅ |
| P16.9 | Marketing lib + API routes + tests | P16.1–P16.8 | ✅ |
| P16.10 | Marketing suite dashboard page | P16.9 | ✅ |

**Deliverable:** Full marketing automation suite — SMS campaigns, audience segmentation, referral programs, retargeting, A/B testing, and influencer matching.

---

### Phase 17 — Mobile Native & Accessibility (v2.4)

**Goal:** First comedy platform with true accessibility focus. Wallet-native tickets.

**Competitive context:** No comedy ticketing platform offers ASL/captioned show discovery. Apple/Google Wallet passes are table stakes that most competitors lack. A native mobile app with offline mode would leapfrog every competitor's mobile-responsive web experience.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P17.1 | React Native app shell (shared API, iOS + Android) | Phase 7 | 📋 Deferred |
| P17.2 | Apple Wallet pass generation (PKPass) | Phase 8 | ✅ |
| P17.3 | Google Wallet pass generation | Phase 8 | ✅ |
| P17.4 | AccessibilityTag model (ASL, captioned, sensory-friendly) | Phase 1 | ✅ |
| P17.5 | Accessibility filter on events & venues | P17.4 | ✅ |
| P17.6 | Offline mode with cached tickets & venue info | P17.1 | ✅ |
| P17.7 | Haptic feedback for live show interactions | P17.1 | 📋 Deferred |
| P17.8 | Voice-guided venue navigation | P17.1 | 📋 Deferred |
| P17.9 | Accessibility lib + API routes + tests | P17.4–P17.5 | ✅ |
| P17.10 | Accessible show discovery page | P17.9 | ✅ |

**Deliverable:** React Native app, Wallet passes, accessibility-first show discovery (ASL, captions, sensory-friendly), offline mode.

---

### Phase 18 — International Expansion & Localization (v2.5)

**Goal:** First US comedy platform to go global — own international comedy discovery.

**Competitive context:** LaughStub, Seat Engine, QuickTix are all US-only. Edinburgh Fringe (3,800+ shows), Melbourne Comedy Festival, Just for Laughs Montreal represent massive untapped markets. No platform connects international festival-goers with local scene discovery.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P18.1 | i18n framework (next-intl, 10+ language support) | Phase 7 | ✅ |
| P18.2 | Multi-currency pricing (Stripe international, auto-conversion) | Phase 8 | ✅ |
| P18.3 | International scene pages (Edinburgh, Melbourne, Montreal, London, Berlin) | Phase 1 | ✅ |
| P18.4 | Festival circuit tracker (FestivalCircuit model) | Phase 1 | ✅ |
| P18.5 | Touring visa/work permit info hub (country-specific guides) | Phase 10 | ✅ |
| P18.6 | Regional comedy style taxonomy (UK panel, Aussie standup, Japanese manzai) | Phase 1 | ✅ |
| P18.7 | Cross-border ticket sales with currency conversion | P18.2 | ✅ |
| P18.8 | Local promoter onboarding program | Phase 12 | ✅ |
| P18.9 | International lib + API routes + tests | P18.1–P18.8 | ✅ |
| P18.10 | International discovery page | P18.9 | ✅ |

**Deliverable:** Multi-language, multi-currency platform with international comedy scenes, festival circuit tracking, and global promoter onboarding.

---

### Phase 13 — Test Harness & Quality (Ongoing)

**Goal:** Comprehensive test coverage across all platform layers.

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| P13.1 | Vitest configuration with jsdom + React Testing Library | — | ✅ |
| P13.2 | Core lib tests (venues, events, comedians, format, constants) | Phase 1 | ✅ |
| P13.3 | Feature lib tests (badges, search, recommendations, tickets) | Phase 3 | ✅ |
| P13.4 | Taste profile & notifications lib tests | Phase 9 | ✅ |
| P13.5 | User export lib tests | Phase 4 | ✅ |
| P13.6 | API route tests (auth, follow, claims, analytics, tickets) | Phase 3 | ✅ |
| P13.7 | Additional API route tests (taste-profile, happening-tonight, discussions) | Phase 9-11 | ✅ |
| P13.8 | Component tests (Nav, forms, buttons, widgets) | Phase 1 | ✅ |
| P13.9 | Additional component tests (AttendanceButtons, Footer, CheckInButton) | Phase 11 | ✅ |
| P13.10 | Playwright E2E tests for critical flows | Phase 7 | 📋 In Progress |

**Deliverable:** 116 test files with 1,755 tests covering lib functions, API routes, and React components with Vitest + React Testing Library.

---

## 3. Dependency Graph (High Level)

```
Phase 1 (Core)
    │
    ├──► Phase 2 (Data Enrichment)
    │
    └──► Phase 3 (User Engagement)
            │
            ├──► Phase 4 (Privacy) [parallel with Phase 2]
            ├──► Phase 5 (Admin)
            └──► Phase 6 (Notifications)
                    │
                    └──► Phase 7 (Polish)
                            │
                            ├──► Phase 8 (Ticketing)
                            │       │
                            ├──► Phase 9 (AI Discovery) ◄── Phase 8 (purchase signals)
                            │       │
                            ├──► Phase 10 (Creator) ◄── Phase 8 (Stripe Connect)
                            │       │
                            ├──► Phase 11 (Community) ◄── Phase 9 (social), Phase 10 (clips)
                            │       │
                            └──► Phase 12 (Marketplace) ◄── Phase 8, 10
                                    │
                                    ├──► Phase 14 (Venue Ops) ◄── Phase 8 (tickets), Phase 12 (CRM)
                                    │
                                    ├──► Phase 15 (Short-Form) ◄── Phase 9 (taste), Phase 11 (clips)
                                    │
                                    ├──► Phase 16 (Marketing) ◄── Phase 9 (segments), Phase 12 (CRM)
                                    │
                                    ├──► Phase 17 (Mobile/A11y) ◄── Phase 8 (Wallet), Phase 14 (kiosk)
                                    │
                                    └──► Phase 18 (International) ◄── Phase 8 (currency), Phase 12 (marketplace)

                            Phase 13 (Tests) runs in parallel with all phases
```

---

## 4. Timeline

| Phase | Sprint | Focus | Status |
|-------|--------|-------|--------|
| Phase 1–4 | Complete | Core, data, users, privacy | ✅ |
| Phase 5–7 | Complete | Admin, notifications, polish | ✅ |
| Phase 8 | Complete | Native ticketing & commerce | ✅ |
| Phase 9 | Complete | AI discovery & social graph | ✅ |
| Phase 10 | Complete | Creator economy tools | ✅ |
| Phase 11 | Complete | Community & live experience | ✅ |
| Phase 12 | Complete | Marketplace & industry platform | ✅ |
| Phase 13 | Ongoing | Test harness & quality | In Progress |
| Phase 14 | Complete | Smart venue operations & POS | ✅ |
| Phase 15 | Complete | Short-form comedy & viral discovery | ✅ |
| Phase 16 | Complete | Audience growth & marketing suite | ✅ |
| Phase 17 | Complete | Mobile native & accessibility | ✅ |
| Phase 18 | Complete | International expansion & localization | ✅ |

---

## 5. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| YouTube API quota | Cache sync results; rate-limit; fallback to last known counts |
| Map consent complexity | CookieConsentProvider already gates map load |
| Admin auth scope creep | Start with API key or role flag; defer full RBAC |
| Email deliverability | Use reputable provider (Resend/SendGrid); verify domain |
| Stripe Connect complexity | Start with platform charges; defer direct payouts to Phase 10 |
| ML recommendation cold start | Fall back to popularity-based recommendations for new users |
| UGC moderation at scale | Start with report-based moderation; add AI moderation in Phase 11.9 |
| Multi-tenant data isolation | Enforce venue-group scoping at query layer; add integration tests |
| POS integration complexity | Start with Square webhook bridge; defer Toast/Clover to post-launch |
| Short-form video storage costs | Use external CDN (Cloudflare R2/S3); enforce 90s/50MB limits |
| SMS compliance (TCPA) | Strict opt-in/opt-out; message frequency caps; compliant consent flows |
| React Native maintenance burden | Share API layer; use Expo for rapid iteration; defer native modules |
| International payment regulations | Start with Stripe-supported countries; add local PSPs as needed |
| i18n translation quality | Use professional translators for top 5 languages; community for rest |
| Accessibility legal compliance | Follow WCAG 2.1 AA; engage accessibility consultant for audit |

---

## 6. Acceptance Criteria (Generic)

For each feature:
- [ ] Works in dev (`npm run dev`)
- [ ] Works in production build (`npm run build`)
- [ ] No console errors for happy path
- [ ] Responsive on mobile
- [ ] Unit tests for lib functions and API routes
- [ ] Component tests for interactive UI elements
- [ ] E2E test for critical user flows (where applicable)
