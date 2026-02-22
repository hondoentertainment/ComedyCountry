# Technical Architecture

## Punchline Atlas

**Version:** 1.0  
**Last Updated:** February 21, 2025

---

## 1. System Overview

Punchline Atlas is a server-rendered Next.js 14 application using the App Router. It provides a nationwide comedy discovery platform with venues, comedians, events, maps, and user engagement features. The architecture follows a monolithic, database-backed design with external API integrations for Maps and YouTube.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  React Components │ Next.js App Router │ Tailwind CSS │ Google Maps JS   │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTP / Server Components
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APPLICATION SERVER                         │
├─────────────────────────────────────────────────────────────────────────┤
│  App Router        │ Server Components  │ API Routes  │ Server Actions   │
│  (RSC)             │ (data fetching)   │ (REST)     │ (future)         │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   PostgreSQL     │       │  NextAuth.js     │       │  External APIs   │
│   (Prisma ORM)   │       │  (OAuth)         │       │  - YouTube v3    │
│                  │       │  - GitHub         │       │  - Google Maps   │
│  - Venues        │       │  - Google        │       │    (client-side)  │
│  - Comedians     │       │                  │       └──────────────────┘
│  - Events        │       │  Prisma Adapter  │
│  - Users         │       │  (Session/Account)│
│  - Reviews       │       └──────────────────┘
│  - Follows       │
└──────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| Runtime | Node.js | 18+ |
| Framework | Next.js | 14.x (App Router) |
| Language | TypeScript | 5.x |
| Database | PostgreSQL | Any hosted (Neon, Supabase, Vercel Postgres) |
| ORM | Prisma | 5.x |
| Auth | NextAuth.js | 4.x (Prisma adapter) |
| Styling | Tailwind CSS | 3.x |
| Maps | @react-google-maps/api | 2.x |
| Testing | Playwright | 1.x (E2E) |

---

## 4. Application Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (Nav, Footer, providers)
│   ├── page.tsx            # Home
│   ├── globals.css
│   ├── venues/             # /venues, /venues/[id]
│   ├── comedians/          # /comedians, /comedians/[slug]
│   ├── schedule/           # /schedule
│   ├── events/[id]/        # /events/[id]
│   ├── map/                # /map
│   ├── auth/signin/        # /auth/signin
│   ├── following/          # /following (auth)
│   ├── profile/            # /profile (auth)
│   ├── settings/           # /settings (auth)
│   ├── terms/              # /terms
│   ├── privacy/            # /privacy
│   └── api/                # API routes
│       ├── auth/[...nextauth]/
│       ├── follow/comedian/[id]/
│       ├── follow/venue/[id]/
│       ├── events/[id]/reviews/
│       ├── events/[id]/reviews/stats/
│       ├── user/profile/
│       ├── user/export/
│       ├── user/delete/
│       ├── import/
│       ├── youtube/sync/
│       └── privacy/
├── components/             # Shared UI
│   ├── Nav.tsx
│   ├── Footer.tsx
│   ├── VenueMap.tsx
│   ├── FollowButton.tsx
│   ├── EventReviewsSection.tsx
│   ├── CookieConsent.tsx
│   ├── SessionProvider.tsx
│   └── ...
├── lib/                    # Business logic, Prisma client
│   ├── prisma.ts
│   ├── venues.ts
│   ├── comedians.ts
│   ├── events.ts
│   └── constants.ts
└── types/                  # TypeScript types
```

---

## 5. Data Flow

### 5.1 Read Path (Server Components)

1. User requests a page (e.g. `/comedians/john-mulaney`)
2. Next.js invokes the Server Component
3. Server Component calls `lib/comedians.ts` (or similar) to fetch from Prisma
4. Prisma queries PostgreSQL
5. HTML is rendered on the server and streamed to the client
6. Client hydrates interactive parts (e.g. FollowButton)

### 5.2 Write Path (API Routes)

1. Client component (e.g. FollowButton) triggers `fetch('/api/follow/comedian/[id]', { method: 'POST' })`
2. API route validates session via `getServerSession()`
3. Route uses Prisma to toggle follow
4. JSON response returned; client updates optimistic UI

### 5.3 Auth Flow

1. User clicks "Sign in with GitHub" (or Google)
2. Redirect to OAuth provider
3. Callback to `/api/auth/callback/[provider]`
4. NextAuth creates/updates User, Account, Session
5. Session cookie set; `getServerSession()` / `useSession()` return user

---

## 6. Database Schema (ER Overview)

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│    Venue     │────►│ EventComedian   │◄────│  Comedian    │
│              │     └─────────────────┘     │              │
└──────┬───────┘              │               └──────┬───────┘
       │                      │                      │
       │               ┌──────▼──────┐               │
       │               │   Event     │               │
       └───────────────┤             │               │
                       └──────┬──────┘               │
                              │                      │
                       ┌──────▼──────┐               │
                       │ EventReview │               │
                       └──────┬──────┘               │
                              │                      │
┌──────────────┐     ┌────────▼───────┐     ┌───────▼───────┐
│ VenueFollow  │     │     User      │     │ ComedianFollow│
└──────────────┘     └────────────────┘     └───────────────┘
```

**Indexes (key):**
- `Venue`: `[state, city]`, `[type]`
- `Event`: `[venueId]`, `[date]`
- `EventReview`: `[eventId]`, `@@unique([eventId, userId])`
- `ComedianFollow`, `VenueFollow`: `@@unique([userId, comedianId/venueId])`

---

## 7. API Design

### 7.1 REST Conventions

- **Authentication:** Session cookie (NextAuth); no API keys for user endpoints
- **Protected routes:** Check `getServerSession()`; return `401` if unauthenticated
- **Response format:** JSON for API routes; HTML for pages

### 7.2 API Routes Summary

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/follow/comedian/[id]` | Required | Toggle follow comedian |
| POST | `/api/follow/venue/[id]` | Required | Toggle follow venue |
| GET | `/api/events/[id]/reviews` | Public | List reviews |
| POST | `/api/events/[id]/reviews` | Required | Submit/update review |
| GET | `/api/events/[id]/reviews/stats` | Public | Rating stats |
| PATCH | `/api/user/profile` | Required | Update profileName |
| GET | `/api/user/export` | Required | Export user data (JSON) |
| DELETE | `/api/user/delete` | Required | Delete account |
| POST | `/api/import` | API key | Bulk import venues/events |
| POST | `/api/youtube/sync` | API key | Sync YouTube channel stats |
| POST | `/api/privacy` | — | GDPR: access, erasure, export |

---

## 8. Security

| Concern | Mitigation |
|---------|------------|
| SQL injection | Prisma parameterized queries |
| XSS | React escaping; no `dangerouslySetInnerHTML` for user content |
| CSRF | SameSite cookies; NextAuth handles OAuth state |
| Auth | Session-based; `getServerSession()` on protected routes |
| API keys | `BULK_IMPORT_API_KEY`, `YOUTUBE_SYNC_API_KEY` for ops endpoints |
| Map data | Cookie consent before loading Maps; no PII in markers |

---

## 9. Deployment

### 9.1 Target Platform

- **Hosting:** Vercel (recommended)
- **Database:** Vercel Postgres, Neon, or Supabase
- **Domain:** Custom domain via Vercel

### 9.2 Build & Deploy

```bash
npm run build    # Next.js production build
npm run start    # Serve production build (or Vercel handles this)
```

- **Migrations:** Run `npm run db:push` (or `prisma migrate deploy`) manually or via CI before/after deploy
- **Seed:** `npm run db:seed` for initial data (one-time)

### 9.3 Environment Variables (Production)

See `README.md` and `DEPLOY.md` for full list. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — Production URL
- `NEXTAUTH_SECRET` — Secure random string
- `GITHUB_ID`, `GITHUB_SECRET` — OAuth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Optional OAuth
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Maps
- `YOUTUBE_API_KEY` — YouTube sync
- `BULK_IMPORT_API_KEY`, `YOUTUBE_SYNC_API_KEY` — Ops protection

---

## 10. Observability & Operations

| Area | Current | Recommendation |
|------|---------|----------------|
| Logging | Console | Vercel logs; add structured logging (e.g. Pino) |
| Errors | Unhandled | Sentry or similar for error tracking |
| Metrics | — | Vercel Analytics; consider custom metrics |
| Health | — | `/api/health` for DB connectivity check |
| Cron | Manual | Vercel Cron for YouTube sync, digest emails |

---

## 11. Future Considerations

- **Caching:** Redis for session/store if needed; consider `unstable_cache` for heavy queries
- **Search:** Full-text search (e.g. Prisma + pg_trgm, or Algolia/Meilisearch) for venues/comedians
- **Media:** S3/Vercel Blob for photo uploads in Admin
- **Real-time:** Not required for current scope; consider Pusher/Ably if live updates needed
