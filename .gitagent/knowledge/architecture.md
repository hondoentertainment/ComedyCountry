# ComedyCountry Architecture Reference

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5 (strict mode)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS (gold #D4AF37, dark #0d0d0d)
- **Auth:** NextAuth.js (GitHub, Google, credentials)
- **Testing:** Vitest + Playwright
- **Payments:** Stripe
- **Deployment:** Vercel
- **Error Tracking:** Sentry
- **Caching:** Vercel KV (Redis)

## Project Structure
```
src/
├── app/           # Pages & API routes (App Router)
│   ├── api/       # 257 REST endpoints across 85 resource groups
│   ├── venues/    # Venue discovery pages
│   ├── comedians/ # Comedian profile pages
│   ├── schedule/  # National calendar
│   ├── admin/     # CMS dashboard
│   └── ...        # 50+ page routes
├── components/    # 122 React components
├── lib/           # 138 utility modules
├── hooks/         # Custom React hooks
├── types/         # TypeScript definitions
└── test/          # Test setup, factories, mocks

prisma/
├── schema.prisma  # 40+ models, 2500+ lines
├── migrations/    # Version-controlled migrations
└── seed.ts        # Database seeding
```

## Key Patterns
- **Imports:** `@/*` → `src/*`
- **Request tracking:** `getRequestId()` / `getClientAddress()` from `src/lib/api.ts`
- **DB client:** Singleton from `src/lib/prisma.ts`
- **Validation:** Zod schemas
- **Auth:** `getServerSession(authOptions)` from `src/lib/auth.ts`

## Environment
Required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
Optional: `YOUTUBE_API_KEY`, `STRIPE_SECRET_KEY`, `SENTRY_DSN`, + 50 more (see `.env.example`)

## CI/CD
GitHub Actions: lint → typecheck → unit tests → DB migrate & seed → E2E tests
Cron: location alerts (daily 9AM UTC), event reminders (every 15 min)
