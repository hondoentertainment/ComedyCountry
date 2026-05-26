# Deployment Guide

Punchline Atlas is a Next.js app that needs a Node.js host, not static hosting like GitHub Pages. The recommended stack is Vercel plus PostgreSQL.

## 1. Push code to GitHub

```bash
git add -A
git commit -m "Ready for deployment"
git push origin main
```

## 2. Set up a production database

Use a hosted PostgreSQL provider such as:

- [Neon](https://neon.tech)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)
- [Vercel Postgres](https://vercel.com/storage/postgres)

You need a connection string like:

```text
postgresql://user:pass@host:5432/punchline_atlas?sslmode=require
```

Migrations run automatically during Vercel builds through `npm run vercel-build`. For a manual deployment, run:

```bash
DATABASE_URL="your-prod-url" npm run db:migrate:deploy
DATABASE_URL="your-prod-url" npm run db:seed
```

## 3. Configure Vercel

1. Go to [vercel.com](https://vercel.com) and import `hondoentertainment/ComedyCountry`.
2. Add environment variables in Project Settings.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Production Postgres URL |
| `DIRECT_DATABASE_URL` | Recommended | Direct Postgres URL for migrations. If omitted, builds fall back to `DATABASE_URL`. |
| `NEXTAUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Canonical production URL, for example `https://your-app.vercel.app` |
| `CRON_SECRET` | Yes | Required for cron routes. Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Optional | For Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | For Google sign-in |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | For venue maps |
| `CALENDAR_FEED_SECRET` | Optional | Falls back to `NEXTAUTH_SECRET` if unset |
| `SENTRY_DSN` | Optional | Recommended before public launch |
| `LOG_LEVEL` | Optional | Use `info` in production unless actively debugging |

3. Deploy. Vercel builds on every push to `main`.

The production build now:

- validates required production env before Prisma runs
- falls back `DIRECT_DATABASE_URL` to `DATABASE_URL` when needed
- runs `prisma migrate deploy`
- runs `next build`

## 4. After first deploy

1. Confirm `NEXTAUTH_URL` matches the live production URL.
2. If Google OAuth is enabled, add `https://your-app.vercel.app/api/auth/callback/google` to the allowed redirect URIs.

## 5. Cron jobs

Set `CRON_SECRET` in Vercel. It protects:

- `/api/cron/location-alerts`
- `/api/cron/event-reminders`

## 6. Runtime checks

Use these endpoints for production monitoring:

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

The health endpoints return `x-request-id` and `x-correlation-id` headers so requests can be tied back to logs and error tracking.

## 7. Post-deploy smoke pass

Run a short verification against the live site:

```bash
npm run deploy:smoke -- https://your-app.vercel.app
```

This checks:

- `/`
- `/schedule`
- `/api/health`
- `/api/health/ready`

## 8. Runtime safety checklist

- Set `NEXTAUTH_URL` to an `https://` URL in production.
- Use a long random `NEXTAUTH_SECRET`, not a placeholder.
- Configure `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` before launch.
- Set `LOG_LEVEL=info` or stricter in production unless actively debugging.

Existing CI lives in `.github/workflows/ci.yml`. Deployments are handled by Vercel's GitHub integration or the Vercel CLI.
