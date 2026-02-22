# E2E Tests (Playwright)

End-to-end tests for Punchline Atlas using Playwright.

## Running Tests

```bash
# Run all E2E tests (starts dev server automatically)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with dev server already running (faster)
# Terminal 1: npm run dev
# Terminal 2: npm run test:e2e
```

## Test Coverage

| Spec File | Coverage |
|-----------|----------|
| `navigation.spec.ts` | Nav links, brand, mobile menu |
| `home.spec.ts` | Hero, sections, CTA links |
| `venues.spec.ts` | Venue list, filters, detail page |
| `comedians.spec.ts` | Comedian list, filters, detail page |
| `schedule.spec.ts` | Event calendar, filters |
| `map.spec.ts` | Map page, fallback states |
| `pagination.spec.ts` | Previous/Next pagination |
| `error-pages.spec.ts` | 404, invalid IDs |

## Requirements

- Database seeded for full coverage (`npm run db:seed`)
- Without seed data, many tests still pass (empty states, navigation, 404)
