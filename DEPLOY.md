# Deployment Guide

Punchline Atlas is a Next.js app that needs a **Node.js host** (not static hosting like GitHub Pages). Recommended: **Vercel** + **PostgreSQL** (Neon, Supabase, or Railway).

## 1. Push your code to GitHub

```bash
git add -A
git commit -m "Ready for deployment"
git push origin main
```

## 2. Set up a production database

You need a hosted PostgreSQL database:

- [Neon](https://neon.tech) (free tier)
- [Supabase](https://supabase.com) (free tier)
- [Railway](https://railway.app)
- [Vercel Postgres](https://vercel.com/storage/postgres)

Get a connection string like:
```
postgresql://user:pass@host:5432/punchline_atlas?sslmode=require
```

Then run migrations:
```bash
DATABASE_URL="your-prod-url" npx prisma db push
DATABASE_URL="your-prod-url" npm run db:seed
```

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → Import `hondoentertainment/ComedyCountry`.
3. Add **Environment Variables** (Project → Settings → Environment Variables):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Production Postgres URL |
| `NEXTAUTH_SECRET` | ✅ | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your Vercel URL, e.g. `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Optional | For Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | For Google sign-in |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | For map page |

4. **Deploy**. Vercel builds and deploys on every push to `main`.

## 4. After first deploy

1. Update `NEXTAUTH_URL` to your live URL.
2. In Google Cloud Console (if using Google OAuth), add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs.

---

**Existing CI**: `.github/workflows/test.yml` runs E2E tests on push/PR. Deployments are handled by Vercel’s GitHub integration.
