# Recommended Next Steps

**Date:** April 5, 2026
**Current State:** 2,367 tests passing, 48 failing across 19 files. TypeScript and ESLint clean. 16 npm vulnerabilities (15 high, 1 moderate).

---

## Phase A: Stabilize (Before Launch)

### 1. Fix npm Security Vulnerabilities (15 high-severity)

**Impact:** Blocks production deployment.

```bash
npm audit fix          # Fixes undici, serialize-javascript
npm audit fix --force  # Fixes workbox chain via @ducanh2912/next-pwa (test build after)
```

Key issues: undici (HTTP smuggling, WebSocket overflow, memory DoS), serialize-javascript (prototype pollution), workbox-build dependency chain.

### 2. Fix 48 Failing Tests (19 files)

**Impact:** Blocks CI green status and production confidence.

| Category                              | Files                                                                                                                                                                                                 | Root Cause                                  | Fix Approach                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| **Components (5 files, 10 failures)** | `EventRatingForm`, `Nav`, `NotificationBell`, `Pagination`, `WaitlistButton`                                                                                                                          | DOM structure changed, selectors stale      | Update test selectors to match current rendered output |
| **API route (1 file, 2 failures)**    | `cron/review-prompts`                                                                                                                                                                                 | Auth check returns 401 before error handler | Fix mock to include cron secret header                 |
| **Libraries (11 files, 34 failures)** | `audience-analytics`, `content-moderation`, `creator-intelligence`, `menu-management`, `podcast-pipeline`, `pos-integration`, `push`, `search`, `sms-campaign`, `streaming-analytics`, `ticket-fraud` | Prisma mock returns missing new fields      | Align mock data with current schema                    |
| **Other (2 files)**                   | `webhook-deliveries`, `webhooks`                                                                                                                                                                      | Same Prisma mock drift                      | Update mock returns                                    |

**Suggested order:** Library tests first (bulk of failures, same root cause), then components, then API route.

### 3. Run `npm audit fix` and Validate Build

```bash
npm audit fix
npm run build
npm run test:run
```

---

## Phase B: Operational Readiness (Week 1-2)

### 4. Database Backup & Disaster Recovery

- Document which hosted PostgreSQL provider will be used (Vercel Postgres, Neon, Supabase, RDS)
- Define RPO/RTO targets (suggested: RPO 1hr, RTO 4hr for v1)
- Create restore runbook and test it once before launch
- Prisma migrations are version-controlled (good), but add point-in-time recovery docs

### 5. Incident Response Setup

- Configure Sentry alert rules for error rate spikes
- Set up uptime monitoring on `/api/health` (UptimeRobot, Better Uptime, or Vercel)
- Document escalation path: who gets paged, how to access logs, how to rollback
- Create a #incidents channel or equivalent

### 6. Environment Variable Validation

- Add startup validation that required env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) are present
- Fail fast with clear error messages instead of cryptic runtime failures
- Review `.env.example` against actual production requirements

### 7. Load Testing Key Endpoints

Priority endpoints to load test:

- `GET /api/search` (most user-facing)
- `GET /api/events` and `GET /api/events/[id]`
- `GET /api/venues` and `GET /api/venues/[id]`
- `GET /api/schedule`
- `POST /api/auth/*` (login flows)

Validate rate limiting works correctly under concurrent load. Monitor DB connection pool saturation.

---

## Phase C: Pre-Launch Hardening (Week 2)

### 8. Security Review

- [ ] Replace ~125 `console.error()` calls with structured logger
- [ ] Document intentional `Access-Control-Allow-Origin: *` on embed endpoints
- [ ] Verify `NEXTAUTH_SECRET` is unique and cryptographically random in production
- [ ] Confirm all OAuth redirect URIs point to production domain
- [ ] Review admin authorization (currently role-based; consider granular permissions if needed)

### 9. Accessibility Polish

Per the Feature Rating Audit:

- [ ] Add skip-to-content link to layout
- [ ] Redesign Following page cards with inline unfollow
- [ ] Replace `alert()` in Settings with in-page toast/feedback
- [ ] Add visible save error feedback to ProfileForm
- [ ] Use viewport-based sizing for map on mobile

### 10. Production Infrastructure

- [ ] Configure Stripe webhook endpoints for production domain
- [ ] Verify cron jobs (location alerts daily 9AM UTC, event reminders every 15min)
- [ ] Set up Vercel KV / Upstash Redis for rate limiting in production
- [ ] Configure production Sentry DSN
- [ ] Test GDPR export/delete flows end-to-end

---

## Phase D: Post-Launch Feature Development

Per the Feature Roadmap, the next feature phases after v1.0 stabilization:

### Phase 5 (v1.1): Native Ticketing & Commerce

- QR code ticket generation and scanning
- Inventory management with hold/release
- Dynamic pricing engine
- Season pass system

### Phase 6 (v1.2): AI Discovery & Social Graph

- ML-powered recommendation engine
- Social graph (friends, mutual follows)
- Personalized home feed
- "Comedy DNA" taste profiling

### Phase 7 (v1.3): Creator Economy Tools

- Comedian analytics dashboard enhancements
- Fan tipping and exclusive content
- Booking request marketplace
- Merch store integration

### Phase 8 (v1.4): Community Features

- Discussion forums per venue/comedian
- Check-in social features
- Short-form clip sharing
- Fan clubs and polls

### Phase 9 (v2.0): Marketplace & Industry Platform

- Agent/manager portal
- Venue group management
- Sponsorship marketplace
- Industry analytics and reporting

---

## Summary

| Priority | Task                               | Effort   | Impact                 |
| -------- | ---------------------------------- | -------- | ---------------------- |
| **P0**   | Fix npm vulnerabilities            | 1 hour   | Security               |
| **P0**   | Fix 48 failing tests               | 1-2 days | CI/CD, confidence      |
| **P1**   | DB backup & disaster recovery docs | 1 day    | Operational safety     |
| **P1**   | Incident response setup            | 1 day    | Operational readiness  |
| **P1**   | Env var validation                 | 2 hours  | Reliability            |
| **P2**   | Load testing                       | 1 day    | Performance confidence |
| **P2**   | Security hardening                 | 1 day    | Security posture       |
| **P2**   | Accessibility polish               | 1 day    | UX quality             |
| **P3**   | Production infra setup             | 2 days   | Launch readiness       |
| **P3**   | Feature phases 5-9                 | Ongoing  | Growth                 |

**Bottom line:** The codebase is 95% complete with strong architecture. Fix the 48 failing tests and npm vulnerabilities, set up operational basics (backups, monitoring, incident response), and you're ready to launch v1.0.
