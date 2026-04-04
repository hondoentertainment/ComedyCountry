# Recommended Next Steps

**Date:** April 4, 2026
**Current State:** v1.0 feature-complete, near production-ready

---

## Pre-Launch (Do Before Go-Live)

### 1. Fix 45 Failing Tests — BLOCKING

The test suite has 2,356 passing tests but 45 failures across 18 files. These fall into three categories:

| Category | Files | Fix |
|----------|-------|-----|
| **Components (5)** | `EventRatingForm`, `Nav`, `NotificationBell`, `Pagination`, `WaitlistButton` | Update DOM selectors and assertions to match current rendered output |
| **API route (1)** | `cron/review-prompts` | Fix auth mock — test expects 500 but gets 401 from cron secret validation |
| **Libraries (12)** | `audience-analytics`, `content-moderation`, `creator-intelligence`, `menu-management`, `podcast-pipeline`, `pos-integration`, `push`, `sms-campaign`, `specials-tracker`, `streaming-analytics`, `ticket-fraud`, `webhook-deliveries` | Align Prisma mock return values with current schema (fields added but not mocked) |

**Estimated effort:** 1–2 days. Start with library tests (biggest batch, same root cause).

### 2. Resolve npm Security Vulnerabilities — HIGH

13 high/critical vulnerabilities detected:

```bash
# Step 1: Safe fixes
npm audit fix

# Step 2: If workbox/next-pwa needs --force, test build afterwards
npm audit fix --force
npm run build
npm run test:run
```

Key packages: `undici` (WebSocket/HTTP smuggling), `serialize-javascript` (prototype pollution), `workbox-build` (transitive deps).

### 3. Set Up Uptime Monitoring — HIGH

The `/api/health` endpoint exists and checks DB connectivity. Wire it up:

- Configure an uptime monitor (UptimeRobot, Better Uptime, or Vercel's built-in checks)
- Set up Sentry alert rules for error-rate spikes
- Define an on-call rotation and escalation path

### 4. Write Operational Runbooks — HIGH

Missing documentation that blocks confident production operation:

- **Database backup & restore procedure** — document provider, RPO/RTO targets, restore steps
- **Incident response runbook** — who gets paged, how to access logs, how to rollback a deploy
- **Environment variable reference** — which vars are required vs optional per environment

---

## Post-Launch Improvements (v1.0.x)

### 5. Migrate `console.error()` to Structured Logger

~125 `console.error()` calls remain across the codebase. The structured JSON logger (`src/lib/logger.ts`) is already built — these just need to be migrated for consistent log aggregation and searchability.

### 6. Load Testing

257 API routes with rate limiting configured but never validated under realistic traffic. Before scaling:

- Run load tests against key flows (search, event discovery, checkout)
- Validate rate-limit behavior under concurrent requests
- Identify bottleneck routes and optimize

### 7. Document CORS Policy for Embed Endpoints

`/api/embed` and `/api/checkout/embed` use `Access-Control-Allow-Origin: *` by design (embeddable widgets). Add explicit documentation explaining this is intentional to prevent future "security fix" regressions.

### 8. Add Security Scanning to CI

The GitHub Actions pipeline covers lint, typecheck, unit tests, and E2E. Add:

- `npm audit` check (fail on high/critical)
- Optional: SAST scanning (CodeQL or Semgrep)

---

## Future Roadmap (v1.1+)

These are already planned in the product roadmap but not yet started:

| Version | Features |
|---------|----------|
| **v1.1** | Native ticketing & checkout, mobile QR tickets, in-app ticket transfers |
| **v1.2** | AI taste matching, smart location alerts, 2-way calendar sync |
| **v1.3** | Exclusive creator content, fan tipping, merch stores, booking requests |
| **v1.4** | Discussion threads, venue check-ins, user-submitted clips, live show chat |

**Recommendation:** Ship v1.0 with the 4 pre-launch items above. Gather real user feedback before committing to v1.1 feature scope — user behavior data may reprioritize what matters most.

---

## Priority Summary

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | Fix 45 failing tests | Blocks CI/deploy | 1–2 days |
| 2 | npm audit fix | Security risk | 1 hour |
| 3 | Uptime monitoring | Outage visibility | 2–3 hours |
| 4 | Operational runbooks | Incident readiness | 1 day |
| 5 | Logger migration | Observability | 1 day |
| 6 | Load testing | Scalability confidence | 2–3 days |
| 7 | CORS documentation | Prevent regressions | 30 min |
| 8 | CI security scanning | Vulnerability prevention | 2–3 hours |
