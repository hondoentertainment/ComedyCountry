---
name: testing
description: Write and run tests for ComedyCountry — unit, integration, and E2E
license: MIT
allowed-tools: Read Edit Write Grep Glob Bash
metadata:
  author: hondoentertainment
  version: "1.0.0"
  category: testing
---

# Testing

## When to Use
When writing tests, fixing test failures, or improving coverage.

## Test Commands
```bash
npm run test              # Vitest watch mode
npm run test:run          # Single run
npm run test:coverage     # Coverage report
npm run test:lib          # src/lib/ tests only
npm run test:api          # src/app/api/ tests only
npm run test:components   # Component tests only
npm run test:e2e          # Playwright E2E (Chrome, Firefox, Safari)
```

## Test File Convention
Tests are collocated with source files:
```
src/lib/tickets.ts        → src/lib/tickets.test.ts
src/components/VenueCard.tsx → src/components/VenueCard.test.tsx
src/app/api/events/route.ts → src/app/api/events/route.test.ts
```

## Test Utilities
Located in `src/test/`:
- `factories.ts` — Test data generation
- `mock-auth.ts` — Mock NextAuth sessions
- `mock-prisma.ts` — Mock Prisma client
- `harness.test.ts` — Integration test harness
- `request-builder.ts` — HTTP request builder

## Patterns

### Unit Test (Vitest)
```typescript
import { describe, it, expect, vi } from 'vitest'
import { myFunction } from './myFunction'

describe('myFunction', () => {
  it('should handle the happy path', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

### API Route Test
```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/prisma', () => ({
  prisma: { model: { findMany: vi.fn().mockResolvedValue([]) } }
}))

describe('GET /api/resource', () => {
  it('returns 200 with data', async () => {
    const response = await GET(new Request('http://localhost/api/resource'))
    expect(response.status).toBe(200)
  })
})
```

### Component Test
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```
