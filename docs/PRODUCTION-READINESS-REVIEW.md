# Production Readiness Review

**App:** Punchline Atlas (ComedyCountry)
**Date:** March 24, 2026
**Status:** Near production-ready with targeted fixes needed

---

## Executive Summary

The codebase is architecturally sound with 257 API routes, 160 Prisma models, 156 test files (2,356 passing / 45 failing), and comprehensive infrastructure. TypeScript and ESLint pass cleanly. The platform has strong foundations — rate limiting, structured logging, input validation (Zod), CSP headers, Sentry error tracking, health checks, and a CI/CD pipeline.

**To reach production grade, focus on these 4 areas:**

1. Fix the 45 failing unit tests (18 test files)
2. Resolve 13 high-severity npm vulnerabilities
3. Add missing operational documentation (backup/recovery, runbooks)
4. Harden a few security/configuration gaps

---

## Current State: What's Working Well

| Area             | Status | Details                                                                                           |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------- |
| TypeScript       | PASS   | `tsc --noEmit` clean, zero errors                                                                 |
| ESLint           | PASS   | Zero warnings or errors                                                                           |
| Rate limiting    | STRONG | Redis/KV with in-memory fallback, applied to auth, embeds, webhooks, sync, imports                |
| Input validation | STRONG | Zod schemas for all API inputs via `validateRequest()`/`validateBody()`                           |
| Auth/AuthZ       | STRONG | NextAuth.js with Google OAuth + credentials, `requireAuth()`/`requireRole()` guards, JWT sessions |
| Security headers | STRONG | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy           |
| Error handling   | STRONG | 25+ route-specific error boundaries, global error handler, Sentry integration                     |
| Logging          | GOOD   | Structured JSON logger with levels, request ID tracking, env-aware config                         |
| Health checks    | GOOD   | `/api/health` with DB connectivity check and 5s timeout                                           |
| Caching          | GOOD   | PWA/Workbox strategies, ISR revalidation, API cache headers                                       |
| CI/CD            | GOOD   | GitHub Actions: lint → typecheck → unit tests → DB migrate/seed → E2E (3 browsers)                |
| Database         | GOOD   | Prisma with connection pooling, migration history, separate direct URL for migrations             |

---

## Priority 1: Fix Failing Tests (BLOCKING)

**45 tests failing across 18 files.** These must pass before production deployment.

### Failing Test Files

| Category       | Files                                                                                                                                                                                                                                             | Likely Cause                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Components** | `EventRatingForm`, `Nav`, `NotificationBell`, `Pagination`, `WaitlistButton`                                                                                                                                                                      | DOM structure changes not reflected in tests, mock setup issues      |
| **API routes** | `cron/review-prompts`                                                                                                                                                                                                                             | Auth check returns 401 before error handler fires (test expects 500) |
| **Libraries**  | `audience-analytics`, `content-moderation`, `creator-intelligence`, `menu-management`, `podcast-pipeline`, `pos-integration`, `push`, `sms-campaign`, `specials-tracker`, `streaming-analytics`, `ticket-fraud`, `webhook-deliveries`, `webhooks` | Prisma mock mismatches, missing mock setups, schema drift            |

### Recommended Fix Approach

1. **Component tests:** Update selectors/assertions to match current rendered output
2. **API route tests:** Fix auth mock to properly bypass cron secret validation
3. **Library tests:** Align Prisma mock returns with current schema (likely added fields not mocked)

---

## Priority 2: Resolve npm Vulnerabilities (HIGH)

**13 high-severity vulnerabilities** detected by `npm audit`.

| Package                                            | Issue                                                                         | Fix                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `undici` 7.0.0–7.23.0                              | WebSocket overflow, HTTP smuggling, CRLF injection, memory DoS (6 advisories) | `npm audit fix` — patch available                                     |
| `serialize-javascript` via `terser-webpack-plugin` | Prototype pollution                                                           | `npm audit fix`                                                       |
| `workbox-build` via `@ducanh2912/next-pwa`         | Vulnerable dependency chain                                                   | Update `@ducanh2912/next-pwa` or `npm audit fix --force` (test after) |

Run `npm audit fix` first. If `--force` is needed for workbox, test the build afterwards.

---

## Priority 3: Operational Readiness (HIGH)

### Missing: Disaster Recovery & Backup Plan

- No documented database backup strategy, RPO/RTO targets, or recovery runbook
- Prisma migrations are version-controlled (good), but no point-in-time recovery docs

**Action items:**

1. Document which DB provider is used in production and its backup policy
2. Define RPO (Recovery Point Objective) and RTO (Recovery Time Objective)
3. Create a runbook: "How to restore the database from backup"
4. Test the restore procedure at least once before launch

### Missing: Incident Response Runbook

- Sentry is configured but no documented triage process
- No on-call rotation or escalation path defined
- Health check exists but no documented alerting setup (e.g., Vercel/UptimeRobot/PagerDuty)

**Action items:**

1. Set up uptime monitoring pointing at `/api/health`
2. Configure Sentry alert rules for error rate spikes
3. Document incident response: who gets paged, how to access logs, how to rollback

### Missing: Load Testing

- 257 API routes but no documented load/stress testing
- Rate limiting is in place but thresholds haven't been validated under load

**Action items:**

1. Run basic load tests against key endpoints (search, schedule, event detail)
2. Validate rate limit behavior under concurrent requests
3. Monitor database connection pool saturation under load

---

## Priority 4: Security Hardening (MEDIUM)

### CORS on Embed Endpoints

- `/api/embed` and `/api/checkout/embed` use `Access-Control-Allow-Origin: *`
- This is intentional for embeddable widgets, but should be explicitly documented
- Consider an allowlist if embed consumers are known

### Console.error Cleanup

- ~125 `console.error()` calls in API routes should use the structured `logger` from `src/lib/logger.ts`
- Unstructured console output in production makes log aggregation and alerting harder

### Environment Variable Validation

- `src/lib/env.ts` has `assertEnv()` but verify all 257 API routes fail gracefully when optional services (Stripe, YouTube, Google Maps) are unavailable
- Add startup validation that required env vars are present before the server accepts traffic

### Admin Authorization

- Current admin check uses simple role matching
- For production with multiple team members, consider granular permissions (read-only admin, content admin, super admin)

---

## Priority 5: Pre-Launch Checklist (BEFORE GO-LIVE)

- [ ] All 2,401 unit tests passing (fix the 45 failures)
- [ ] E2E tests passing in CI (13 Playwright specs across Chrome/Firefox/WebKit)
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] Production database provisioned with SSL, connection pooling, and automated backups
- [ ] All required env vars set in Vercel (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET`)
- [ ] `NEXTAUTH_SECRET` is a unique, cryptographically random value (not the dev default)
- [ ] Sentry DSN configured and verified (trigger a test error)
- [ ] Uptime monitoring active on `/api/health`
- [ ] DNS and SSL configured for custom domain
- [ ] Google OAuth redirect URI updated to production domain
- [ ] Stripe webhook endpoint updated to production URL
- [ ] Cron jobs verified (`/api/cron/location-alerts`, `/api/cron/event-reminders`)
- [ ] Load test completed on key flows
- [ ] Disaster recovery runbook written and tested
- [ ] GDPR/privacy: user data export (`/api/user/export`) and delete (`/api/user/delete`) verified working
- [ ] Review and remove any development-only seeds/data

---

## Phase Roadmap Context

Per the existing feature roadmap (`docs/FEATURE-ROADMAP.md`), phases v0.1–v1.0 are complete. The next planned phases are:

| Phase | Theme                               | Status      |
| ----- | ----------------------------------- | ----------- |
| v1.1  | Native Ticketing & Commerce         | Not started |
| v1.2  | AI-Powered Discovery & Social Graph | Not started |
| v1.3  | Creator Economy & Direct-to-Fan     | Not started |
| v1.4  | Community & Live Experience         | Not started |

**Recommendation:** Stabilize v1.0 for production before beginning Phase 5 features. The 4 priority areas above should take 1-2 sprints and will ensure a solid, production-grade foundation.

---

## Summary of Next Steps (Ordered)

1. **Fix 45 failing tests** — align mocks with current schema, update component test selectors
2. **Run `npm audit fix`** — resolve undici and serialize-javascript vulnerabilities
3. **Set up uptime monitoring + Sentry alerts** — operational visibility from day one
4. **Write disaster recovery runbook** — database backup/restore procedure
5. **Migrate `console.error` to structured logger** — clean production log output
6. **Complete pre-launch checklist** — env vars, OAuth, Stripe, cron verification
7. **Load test key endpoints** — validate rate limits and DB pool under traffic
8. **Ship v1.0 to production**
