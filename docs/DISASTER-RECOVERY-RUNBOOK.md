# Disaster Recovery & Backup Runbook

**Last Updated:** April 4, 2026

---

## Database Backup Strategy

### Production Provider: Vercel Postgres / Neon

| Setting                            | Value                                                   |
| ---------------------------------- | ------------------------------------------------------- |
| **Automatic Backups**              | Daily snapshots (provider-managed)                      |
| **RPO (Recovery Point Objective)** | 24 hours (daily backups) / Near-zero with WAL archiving |
| **RTO (Recovery Time Objective)**  | < 1 hour                                                |
| **Retention**                      | 7 days (daily snapshots)                                |
| **Point-in-Time Recovery**         | Supported via WAL (provider-dependent)                  |

### Manual Backup Procedure

```bash
# Export full database dump
pg_dump "$DATABASE_URL" --format=custom --file=backup-$(date +%Y%m%d-%H%M%S).dump

# Export schema only (for reference)
pg_dump "$DATABASE_URL" --schema-only --file=schema-$(date +%Y%m%d).sql

# Export specific tables
pg_dump "$DATABASE_URL" --table=User --table=Event --table=Venue --format=custom --file=core-tables.dump
```

### Automated Backup (Cron)

Add to server cron or GitHub Actions scheduled workflow:

```bash
# Daily backup at 2 AM UTC — upload to S3/GCS
0 2 * * * pg_dump "$DATABASE_URL" --format=custom | aws s3 cp - s3://punchline-atlas-backups/db/backup-$(date +\%Y\%m\%d).dump
```

---

## Restore Procedures

### Full Database Restore

```bash
# 1. Put the application in maintenance mode (scale to 0 or set env var)
# 2. Restore from backup
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backup-YYYYMMDD.dump

# 3. Verify data integrity
npx prisma db pull    # Ensure schema matches
npx prisma generate   # Regenerate client

# 4. Run health check
curl -f https://punchline-atlas.vercel.app/api/health

# 5. Remove maintenance mode
```

### Point-in-Time Recovery (Provider-Specific)

For Neon:

1. Navigate to the Neon dashboard
2. Select the project and branch
3. Use "Restore" to pick a specific timestamp
4. Verify application connectivity

For Vercel Postgres:

1. Navigate to Vercel dashboard > Storage
2. Select the database
3. Use the backup/restore UI to select a snapshot

### Migration Rollback

```bash
# View migration history
npx prisma migrate status

# If a bad migration was applied, restore from pre-migration backup
# Then fix the migration file and re-apply
npx prisma migrate deploy
```

---

## Incident Response Runbook

### Severity Levels

| Level    | Description                  | Response Time     | Examples                                               |
| -------- | ---------------------------- | ----------------- | ------------------------------------------------------ |
| **SEV1** | Service down, data loss risk | < 15 min          | DB unreachable, auth broken, payment failures          |
| **SEV2** | Major feature broken         | < 1 hour          | Search down, event pages 500ing, notifications failing |
| **SEV3** | Minor feature issue          | < 4 hours         | Embed widget broken, analytics gaps, slow queries      |
| **SEV4** | Cosmetic / low impact        | Next business day | UI glitch, non-critical log errors                     |

### Escalation Path

1. **First Responder:** On-call engineer receives alert (PagerDuty/Sentry)
2. **Triage:** Assess severity, check dashboards (Sentry, Vercel, DB provider)
3. **Escalate if SEV1/SEV2:** Notify team lead and stakeholders
4. **Communicate:** Post status update (status page or team channel)
5. **Resolve:** Fix or rollback
6. **Post-mortem:** Document within 48 hours for SEV1/SEV2

### Accessing Logs

```bash
# Vercel function logs (last 1 hour)
vercel logs --since 1h

# Sentry — check error dashboard
# https://sentry.io/organizations/<org>/issues/

# Database logs — via provider dashboard (Neon/Vercel Postgres)
```

### Common Incident Playbooks

#### Application 500 Errors Spiking

1. Check Sentry for error details and stack trace
2. Check Vercel deployment — did a new deploy just go out?
3. If deploy caused it: rollback via Vercel dashboard (Deployments > Promote previous)
4. If DB related: check connection pool usage, run `SELECT count(*) FROM pg_stat_activity`

#### Database Connection Exhaustion

1. Check active connections: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`
2. Kill long-running queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 minutes'`
3. Verify connection pooling config in `DATABASE_URL` (add `?pgbouncer=true` if using pooler)

#### Payment Failures (Stripe)

1. Check Stripe dashboard for webhook delivery failures
2. Verify `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in Vercel env
3. Check `/api/webhooks/stripe` logs in Sentry
4. Retry failed webhooks from Stripe dashboard

#### Rate Limiting False Positives

1. Check the in-memory rate limit store — restarts clear it
2. If persistent, adjust limits in the relevant route's `checkRateLimit()` call
3. Monitor via structured logs: search for `"Rate limit exceeded"` messages

### Rollback Procedure

```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
# 1. Go to Deployments
# 2. Find the last known-good deployment
# 3. Click "..." > "Promote to Production"

# Database rollback (if migration caused issue)
# Restore from pre-migration backup (see Restore Procedures above)
```

---

## Environment Variable Reference

### Required (App Won't Start Without These)

| Variable          | Description                                | Example                                         |
| ----------------- | ------------------------------------------ | ----------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string (with pooler) | `postgresql://user:pass@host/db?pgbouncer=true` |
| `NEXTAUTH_URL`    | Canonical app URL                          | `https://punchline-atlas.vercel.app`            |
| `NEXTAUTH_SECRET` | Session encryption key (32+ chars)         | `openssl rand -base64 32`                       |

### Required for Full Functionality

| Variable                          | Description             | Used By                  |
| --------------------------------- | ----------------------- | ------------------------ |
| `GOOGLE_CLIENT_ID`                | Google OAuth app ID     | NextAuth Google provider |
| `GOOGLE_CLIENT_SECRET`            | Google OAuth secret     | NextAuth Google provider |
| `STRIPE_SECRET_KEY`               | Stripe API key          | Payments, subscriptions  |
| `STRIPE_WEBHOOK_SECRET`           | Stripe webhook signing  | `/api/webhooks/stripe`   |
| `YOUTUBE_API_KEY`                 | YouTube Data API v3 key | YouTube sync, specials   |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS API key  | Maps, venue pages        |

### Optional

| Variable      | Description                | Default                           |
| ------------- | -------------------------- | --------------------------------- |
| `CRON_SECRET` | Auth for cron endpoints    | None (cron endpoints unprotected) |
| `SENTRY_DSN`  | Sentry error tracking      | None (errors logged locally)      |
| `LOG_LEVEL`   | Structured logger level    | `debug` (dev) / `info` (prod)     |
| `DIRECT_URL`  | Direct DB URL (migrations) | Falls back to `DATABASE_URL`      |

---

## Health Checks

| Endpoint          | Purpose               | Expected               |
| ----------------- | --------------------- | ---------------------- |
| `GET /api/health` | App + DB connectivity | `200 { status: "ok" }` |

### Monitoring Setup

Configure your uptime monitoring service to check:

- **URL:** `https://punchline-atlas.vercel.app/api/health`
- **Method:** GET
- **Interval:** 1 minute
- **Timeout:** 10 seconds
- **Alert on:** 2+ consecutive failures
- **Alert channels:** PagerDuty, Slack, Email
