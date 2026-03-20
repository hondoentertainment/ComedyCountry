---
name: db-schema
description: Design and evolve the Prisma database schema for ComedyCountry
license: MIT
allowed-tools: Read Edit Write Grep Glob Bash
metadata:
  author: hondoentertainment
  version: "1.0.0"
  category: database
---

# Database Schema Development

## When to Use
When adding models, fields, relations, indexes, or enums to the Prisma schema.

## Schema Location
`prisma/schema.prisma` — 2500+ lines, 40+ models

## Workflow

1. **Edit** `prisma/schema.prisma`
2. **Generate** client: `npm run db:generate`
3. **Push** (local dev): `npm run db:push`
4. **Migrate** (production): Create migration with descriptive name
5. **Seed** if needed: `npm run db:seed`

## Key Model Groups

### Core Entities
- `Venue` — capacity, type, location, photos, social links
- `Comedian` — slug, bio, genres, YouTube channel, specials
- `Event` — date, showtime, venue link, pricing, ticket types
- `User` — auth, profile, subscription tier

### Relations Pattern
```prisma
model Event {
  id        String   @id @default(cuid())
  venueId   String
  venue     Venue    @relation(fields: [venueId], references: [id])
  comedians EventComedian[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([venueId])
}
```

### Enum Pattern
```prisma
enum TicketStatus {
  ACTIVE
  USED
  CANCELLED
  TRANSFERRED
  REFUNDED
}
```

## Conventions
- Use `cuid()` for IDs
- Always add `createdAt` and `updatedAt`
- Add `@@index` for foreign keys and frequently queried fields
- Use `@relation` with explicit field/reference mapping
- Use enums for fixed status/type fields
- Add `@@unique` constraints for natural keys
