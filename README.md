# Punchline Atlas

The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Product Requirements Document |
| [Implementation Plan](docs/IMPLEMENTATION-PLAN.md) | Phases, tasks, timeline |
| [Technical Architecture](docs/TECHNICAL-ARCHITECTURE.md) | System design, tech stack |
| [Use Cases](docs/USE-CASES.md) | Top use cases with flows |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS
- **APIs:** YouTube Data API v3 (channel sync), Google Maps

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Set your `DATABASE_URL` for PostgreSQL. Example:

```
DATABASE_URL="postgresql://user:password@localhost:5432/punchline_atlas"
```

### 3. Initialize the database

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── venues/       # Venue repository
│   ├── comedians/    # Comedian profiles
│   └── schedule/     # National calendar
├── components/       # React components
└── lib/              # Utilities, Prisma client
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Seed data
```

## Database Schema

- **Venue** — Name, location, capacity, type, photos, social links
- **Comedian** — Name, bio, genres, touring status, specials
- **Event** — Venue + comedian(s), date, showtime, ticket link
- **YouTubeChannel** — Linked to comedian, subscriber count, videos
- **User / Follow** — Phase 3: follow comedians and venues

## Scripts

| Command       | Description                    |
|---------------|--------------------------------|
| `npm run dev` | Start development server       |
| `npm run build` | Build for production         |
| `npm run db:push` | Push schema to database (local prototyping only)   |
| `npm run db:migrate:deploy` | Apply committed migrations |
| `npm run db:studio` | Open Prisma Studio (GUI) |
| `npm run db:seed` | Run seed script           |
| `npm run db:sync-youtube` | Sync YouTube channel stats (requires YOUTUBE_API_KEY) |
| `npm run db:import -- <file>` | Bulk import venues and events from JSON file |
| `npm run db:prod:setup` | Push schema + seed (for production init) |

## Deployment (Vercel)

### 1. Provision PostgreSQL

Use one of:

- **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)** (Storage tab → Create Database)
- **[Neon](https://neon.tech)** – free tier, copy the connection string
- **[Supabase](https://supabase.com)** – free tier, use the Postgres URL from Project Settings

### 2. Initialize the database (one-time)

With `DATABASE_URL` in `.env` pointing to your production Postgres:

```bash
npm run db:prod:setup
```

Then run `npm run db:seed` only when you explicitly want to seed that environment.

### 3. Connect to Vercel

1. Push your code to GitHub (init git if needed: `git init && git add . && git commit -m "Initial commit"`)
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → Import your repo
3. Add **Environment Variables** (Project → Settings → Environment Variables):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `NEXTAUTH_URL` | Yes | `https://your-app.vercel.app` (update after first deploy) |
| `NEXTAUTH_SECRET` | Yes | Random string, e.g. `openssl rand -base64 32` |
| `GITHUB_ID` | Yes | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth (enables "Continue with Google") |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | For venue maps |
| `YOUTUBE_API_KEY` | No | For comedian channel sync |
| `BULK_IMPORT_API_KEY` | No | Protects POST /api/import |
| `YOUTUBE_SYNC_API_KEY` | No | Protects POST /api/youtube/sync |

4. Deploy. Vercel will build and deploy on every push to the default branch.

### 4. Update NEXTAUTH_URL

After the first deploy, set `NEXTAUTH_URL` to your live URL (e.g. `https://punchline-atlas.vercel.app`) and redeploy if needed.
