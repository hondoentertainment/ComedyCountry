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

### Phase 7 — v1.0 Polish 📋 **PLANNED**

**Goal:** Production-ready experience.

| Task | Description | Dependencies | Est. Effort |
|------|-------------|--------------|-------------|
| P7.1 | PWA support (manifest, service worker) | Phase 1 | 1–2 days |
| P7.2 | Offline fallback for critical pages | P7.1 | 1–2 days |
| P7.3 | Performance audit (LCP, CLS, FID) | — | 0.5 day |
| P7.4 | Image optimization (Next/Image, blur placeholders) | — | 1 day |
| P7.5 | SEO audit (meta, sitemap, robots.txt) | — | 0.5 day |
| P7.6 | Accessibility audit (WCAG 2.1 AA) | — | 1–2 days |
| P7.7 | E2E test coverage (Playwright) expansion | Phase 3 | 1–2 days |

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
```

---

## 4. Recommended Timeline (Remaining Work)

| Phase | Sprint | Focus |
|-------|--------|-------|
| Phase 5 | 1–2 weeks | Admin/CMS MVP |
| Phase 6 | 2–3 weeks | In-app feed + email notifications |
| Phase 7 | 1–2 weeks | PWA, performance, accessibility, E2E |

**Total estimate (Phases 5–7):** 4–7 weeks for one developer.

---

## 5. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| YouTube API quota | Cache sync results; rate-limit; fallback to last known counts |
| Map consent complexity | CookieConsentProvider already gates map load |
| Admin auth scope creep | Start with API key or role flag; defer full RBAC |
| Email deliverability | Use reputable provider (Resend/SendGrid); verify domain |

---

## 6. Acceptance Criteria (Generic)

For each feature:
- [ ] Works in dev (`npm run dev`)
- [ ] Works in production build (`npm run build`)
- [ ] No console errors for happy path
- [ ] Responsive on mobile
- [ ] E2E test for critical path (where applicable)
