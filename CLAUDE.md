# CLAUDE.md — Punchline Atlas (ComedyCountry)

## Project Overview

Punchline Atlas is a nationwide comedy intelligence platform for discovering venues, tracking comedian tours, and never missing a show. Built with Next.js 14 (App Router), TypeScript, PostgreSQL/Prisma, and deployed on Vercel.

## Quick Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking (tsc --noEmit)

# Testing
npm run test             # Vitest (watch mode)
npm run test:run         # Vitest (single run)
npm run test:coverage    # Coverage report
npm run test:lib         # Test src/lib/ only
npm run test:api         # Test src/app/api/ only
npm run test:components  # Test components only
npm run test:e2e         # Playwright E2E tests

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema (local only)
npm run db:migrate:deploy # Apply migrations
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Seed database
npm run db:seed-all      # Comprehensive seed
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5 (strict mode)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS (brand colors: gold `#D4AF37`, dark `#0d0d0d`)
- **Auth:** NextAuth.js (GitHub, Google, local credentials)
- **Testing:** Vitest (unit, jsdom) + Playwright (E2E: Chrome/Firefox/Safari)
- **Deployment:** Vercel
- **Error Tracking:** Sentry
- **Payments:** Stripe
- **APIs:** YouTube Data API v3, Google Maps

## Project Structure

```
src/
├── app/           # Pages & API routes (98+ API routes)
│   ├── api/       # REST endpoints
│   ├── venues/    # Venue discovery
│   ├── comedians/ # Comedian profiles
│   ├── schedule/  # National calendar
│   ├── admin/     # CMS dashboard
│   └── ...
├── components/    # React components (103)
├── lib/           # Utilities & business logic (40+)
├── hooks/         # Custom React hooks
├── types/         # TypeScript definitions
└── test/          # Test setup & fixtures

prisma/
├── schema.prisma  # Database schema
├── migrations/    # Version-controlled migrations
└── seed.ts        # Seeding script
```

## Code Conventions

- **Imports:** Use `@/*` path alias (maps to `src/*`)
- **Components:** PascalCase filenames (`VenueCard.tsx`)
- **Utilities:** camelCase filenames (`comedians.ts`)
- **API routes:** `src/app/api/<resource>/[id]/route.ts`
- **Tests:** Collocated with source (`*.test.ts` / `*.test.tsx`)
- **Styling:** Tailwind CSS only (no CSS modules)
- **Request tracking:** Use `getRequestId()` and `getClientAddress()` from `src/lib/api.ts`
- **Database:** Always run `npm run db:generate` after schema changes

## Environment Variables

**Required:** `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

**Optional:** `YOUTUBE_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `SENTRY_DSN`

See `.env.example` for the full list.

## CI/CD

GitHub Actions runs on push/PR to main: lint → typecheck → unit tests → DB migrate & seed → E2E tests. Deployment is via Vercel with cron jobs for location alerts (daily 9AM UTC) and event reminders (every 15 min).
