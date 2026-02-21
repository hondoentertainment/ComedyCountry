# Punchline Atlas

The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.

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
npm run db:push
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
| `npm run db:push` | Push schema to database   |
| `npm run db:studio` | Open Prisma Studio (GUI) |
| `npm run db:seed` | Run seed script           |
| `npm run db:sync-youtube` | Sync YouTube channel stats (requires YOUTUBE_API_KEY) |
| `npm run db:import -- <file>` | Bulk import venues and events from JSON file |
