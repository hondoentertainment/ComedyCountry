---
name: feature-dev
description: Build end-to-end features for ComedyCountry — from schema to UI
license: MIT
allowed-tools: Read Edit Write Grep Glob Bash
metadata:
  author: hondoentertainment
  version: "1.0.0"
  category: development
---

# Feature Development

## When to Use
When building a new feature or extending an existing one across the full stack.

## Workflow

1. **Schema** — Add/modify models in `prisma/schema.prisma`
2. **Migrate** — Run `npm run db:generate` then `npm run db:push` (local) or create a migration
3. **Utility** — Add business logic in `src/lib/<feature>.ts`
4. **API Route** — Create endpoints in `src/app/api/<resource>/route.ts`
5. **Component** — Build React components in `src/components/<Feature>.tsx`
6. **Page** — Wire into pages under `src/app/<feature>/page.tsx`
7. **Test** — Write collocated tests (`*.test.ts`)

## Patterns to Follow

### API Route Pattern
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestId, getClientAddress } from '@/lib/api'

export async function GET(request: Request) {
  const requestId = getRequestId()
  try {
    const data = await prisma.model.findMany()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
```

### Component Pattern
```tsx
'use client'
import { useState, useEffect } from 'react'

interface Props { /* typed props */ }

export default function FeatureName({ ...props }: Props) {
  return (
    <div className="bg-dark text-white">
      {/* Tailwind only, brand colors: gold #D4AF37, dark #0d0d0d */}
    </div>
  )
}
```

## Feature Phases Reference
- Phase 1-4: Core (venues, comedians, events, auth)
- Phase 5: Ticketing & commerce
- Phase 6: Discovery & recommendations
- Phase 7: Creator economy
- Phase 8: Community
- Phase 9: Industry marketplace
- Phase 12: Advanced ticketing
- Phase 13: Creator intelligence
- Phase 14: Venue operations
- Phase 15: Podcast pipeline
- Phase 17: Accessibility
- Phase 18: Scene intelligence
