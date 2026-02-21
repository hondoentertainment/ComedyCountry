# Deploy to Vercel

## Prerequisites

- GitHub account
- Vercel account (free at [vercel.com](https://vercel.com))
- Hosted PostgreSQL database (Neon, Supabase, Railway, etc.)

## Steps

### 1. Push to GitHub

```bash
# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/punchline-atlas.git
git branch -M main
git push -u origin main
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repo
3. Vercel auto-detects Next.js — no config needed

### 3. Set environment variables

In Vercel → Project → **Settings** → **Environment Variables**, add:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string from Neon/Supabase/Railway |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | For map page |
| `YOUTUBE_API_KEY` | No | For comedian channel sync (optional) |
| `BULK_IMPORT_API_KEY` | No | Protects `/api/import` when set |

### 4. Run migrations

After first deploy, run schema and seed once:

```bash
# Locally, point DATABASE_URL to your hosted Postgres
npm run db:push
npm run db:seed
```

Or use a one-off script/CI job. Vercel does not run migrations automatically.

---

**Production branch:** Pushes to `main` deploy to production. Other branches get preview URLs.
