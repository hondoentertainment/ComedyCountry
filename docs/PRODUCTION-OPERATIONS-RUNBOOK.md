# Production Operations Runbook

This runbook covers the minimum operator workflows needed to keep Punchline Atlas trustworthy in production.

## Scope

- Initial operating footprint: NYC, LA, Chicago, Austin, Philly
- Primary promise: fresh lineups, venue intel, accessibility metadata, fair pricing, and creator attribution
- Primary risk: stale or partial data making the trusted comedy graph feel unreliable

## Operator Checklist

### Daily

1. Run `npm run ops:readiness` against production-connected credentials.
2. Review `/admin/operations` for:
   - upcoming event gaps
   - venue metadata gaps
   - recent import errors
   - stale queue growth
3. Review `/admin/freshness` and clear the worst stale events first.

### Before every import

1. Run a dry run:

```bash
npm run db:import -- data/sample-import.json --dry-run --source=manual-ops
```

2. If production should stay inside the five launch cities, enable:

```env
IMPORT_STRICT_TARGET_CITIES="true"
```

3. Confirm the payload does not exceed the configured guardrails:
   - `IMPORT_MAX_VENUES`
   - `IMPORT_MAX_EVENTS`

### After every import

1. Re-run `npm run ops:readiness`.
2. Check `/admin/operations` recent imports to confirm:
   - expected venue/event write counts
   - zero unexpected errors
   - target-city impact looks reasonable
3. Spot-check `/schedule`, `/scenes/[city]`, and the affected admin detail pages.

## Seed and Coverage Tooling

### Five-city seed

Use the deterministic target-city seed to stand up trusted-graph depth in the launch markets:

```bash
npm run db:seed-target-cities
```

This creates:

- curated venues across NYC, LA, Chicago, Austin, and Philly
- working-comedian seed profiles
- upcoming events
- fair-ticket policies
- accessibility tags

### Readiness and coverage snapshot

```bash
npm run ops:readiness
```

This prints:

- import guardrails
- five-city coverage
- upcoming event gaps
- venue metadata gaps
- recent import runs

## Backup and Restore

### Create a backup

Use `pg_dump` from a machine that can reach the production database:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=punchline-atlas-$(date +%Y%m%d-%H%M%S).dump
```

For Windows PowerShell:

```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
pg_dump $env:DATABASE_URL --format=custom --file="punchline-atlas-$timestamp.dump"
```

### Restore into a recovery database

```bash
pg_restore --clean --if-exists --no-owner --dbname "$RECOVERY_DATABASE_URL" punchline-atlas-YYYYMMDD-HHMMSS.dump
```

### Backup expectations

- nightly automated backup at the database provider level
- manual backup before bulk backfills or large import runs
- restore drill at least once before public launch

## Recommended Production Env

```env
NEXTAUTH_URL="https://your-production-domain.vercel.app"
NEXTAUTH_SECRET="generate-a-32-plus-character-secret"
CRON_SECRET="generate-a-separate-32-plus-character-secret"
BULK_IMPORT_API_KEY="set-this-in-production"
IMPORT_STRICT_TARGET_CITIES="true"
IMPORT_MAX_VENUES="150"
IMPORT_MAX_EVENTS="400"
```

For database access:

- `DATABASE_URL` is required.
- `DIRECT_DATABASE_URL` is recommended for direct migrations.
- If `DIRECT_DATABASE_URL` is not set, the Vercel build falls back to `DATABASE_URL`.

## Failure Triage

### Import failed

1. Re-run the same payload in `--dry-run`.
2. Resolve schema or lookup errors first:
   - missing comedians
   - unknown venues
   - invalid URLs or price ranges
3. Confirm the import appears in `/admin/operations` recent imports.

### Coverage regressed

1. Run `npm run ops:readiness`.
2. Open `/admin/freshness`.
3. Prioritize:
   - events in the next 7 days with missing ticket URLs or showtimes
   - venues missing website, coordinates, or accessibility metadata

### Emergency rollback

1. Stop further imports.
2. Restore the latest clean backup into a recovery database.
3. Validate counts with `npm run ops:readiness`.
4. Re-point the application only after basic smoke checks pass.

### Post-deploy smoke pass

Run after each production deploy:

```bash
npm run deploy:smoke -- https://your-production-domain.vercel.app
```
