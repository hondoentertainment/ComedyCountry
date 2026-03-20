---
name: api-dev
description: Build and maintain REST API endpoints for ComedyCountry
license: MIT
allowed-tools: Read Edit Write Grep Glob Bash
metadata:
  author: hondoentertainment
  version: "1.0.0"
  category: api
---

# API Development

## When to Use
When creating, modifying, or debugging API routes.

## Directory Convention
```
src/app/api/
├── <resource>/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/
│       └── route.ts      # GET (detail), PUT/PATCH (update), DELETE
```

## Required Patterns

### Request Tracking
Every route must use request tracking:
```typescript
import { getRequestId, getClientAddress } from '@/lib/api'
```

### Validation
Use Zod for request body validation:
```typescript
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1).max(255),
  // ...
})
```

### Auth Protection
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Error Responses
Use consistent error shapes:
```typescript
{ error: string, details?: any }
```
Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

## Existing API Groups (85 resource categories, 257 routes)
Core: comedians, venues, events, search, users
Social: follow, reviews, activity, discussions, live-chat, clips
Ticketing: tickets, checkout, refunds, season-passes, fair-ticketing
Creator: creator, creator-intelligence, podcast-pipeline, exclusive-content
Venue Ops: venue-ops, venue-crm, venue-dashboard, venue-groups
Discovery: discovery, for-you, trending, happening-tonight, taste-profile
Admin: admin, analytics, reports, moderation
Integrations: stripe, youtube, notifications, push, calendar, webhooks
