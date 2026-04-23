# Next Implementation Wave

## Trusted Comedy Graph Execution Plan

**Last Updated:** April 23, 2026

---

## 1. Purpose

This document turns the trusted comedy graph roadmap into execution-ready work.

Use this as the implementation bridge between:

- [TRUSTED-COMEDY-GRAPH.md](./TRUSTED-COMEDY-GRAPH.md)
- [FEATURE-ROADMAP.md](./FEATURE-ROADMAP.md)
- Existing code assets under `src/`, `prisma/`, and `docs/`

The next wave should not add broad feature categories. It should glue together and productize the most strategic assets already in the repo.

---

## 2. Execution Matrix

| Workstream | Readiness | Primary gap | First deliverable |
|---|---|---|---|
| Freshness Infrastructure | Needs glue | Freshness exists as separate crons, caches, and admin workflows, not one coordinated layer | A freshness service, target-city dashboard, and stale-data queue |
| Fair + Accessible Discovery | Ready now | Fairness and accessibility are parallel lanes, not unified in event discovery | Event-card trust badges and trust filters |
| Best Room For This Comic Tonight | Needs glue | Room-fit signals exist, but no single endpoint or UI combines them | Room-fit scorer and recommendation explanations |
| Route Builder / Booking Intelligence | Net-new build | Booking primitives exist, but no multi-city route planning or itinerary logic | Route candidate generator and booking intelligence report |
| Narrow Ticketing Pilots | Ready now | Ticketing primitives are strong but fragmented across purchase, scan, waitlist, resale, and pricing | Pilot venue flow with graph-first instrumentation |

---

## 3. Workstream 0: Freshness Infrastructure

### Current hooks

- `src/app/api/cron/event-reminders/route.ts`
- `src/app/api/cron/location-alerts/route.ts`
- `src/app/api/cron/review-prompts/route.ts`
- `src/lib/offline-cache.ts`
- `src/lib/calendar-sync.ts`
- `src/app/api/news/feed/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/import/route.ts`
- `src/lib/import.ts`
- `src/app/admin/*`

### Gap

There is no single freshness/staleness service, freshness score, source confidence model, or target-city coverage dashboard.

### Build next

1. Add a freshness model or service that can score venues, events, lineups, open mics, comedians, and accessibility/fair-pricing metadata.
2. Add target-city coverage dashboards for NYC, LA, Chicago, Austin, and Philly.
3. Add stale-data queues for admins and curators.
4. Add last-verified and source-confidence surfaces in admin, city, venue, and event views.
5. Add claimed profile update flows for venues and comedians to submit corrections.

### Acceptance criteria

- Each target city has a visible coverage score.
- Each upcoming event can show last verified date and freshness status.
- Admins can filter stale records by city, type, and urgency.
- Freshness changes can trigger curator or venue notifications.

---

## 4. Workstream 1: Fair + Accessible Discovery

### Current hooks

- `src/app/accessible-shows/page.tsx`
- `src/components/AccessibilityBadge.tsx`
- `src/components/AccessibilityFilter.tsx`
- `src/lib/accessibility-discovery.ts`
- `src/lib/fair-ticketing.ts`
- `src/components/FairTicketingWidget.tsx`
- `src/app/api/accessibility/*`
- `src/app/api/fair-ticketing/*`

### Gap

Accessibility and fairness exist, but they are not yet unified as a trust layer in mainstream fan discovery.

### Build next

1. Add event-card trust badges for accessibility, transparent fees, anti-scalping, controlled resale, and waitlist availability.
2. Add trust filters to schedule, city, and accessible-show surfaces.
3. Add venue trust panels for accessibility, fair pricing, last verified date, and source confidence.
4. Add verification workflows for accessibility tags and fair-pricing policies.
5. Add a fan-facing fair-ticketing explainer.

### Acceptance criteria

- Fans can filter by accessibility and fair-pricing criteria.
- Event cards show trust indicators without opening event detail pages.
- Venue pages summarize trust status clearly.
- Verified accessibility and fair-pricing metadata is distinguishable from unverified metadata.

---

## 5. Workstream 2: Best Room For This Comic Tonight

### Current hooks

- `src/lib/discovery-engine.ts`
- `src/lib/comedy-genome.ts`
- `src/lib/scene-intelligence.ts`
- `src/lib/analytics-engine.ts`
- `src/lib/event-insights.ts`
- `src/components/DiscoveryFeed.tsx`
- `src/app/discover/page.tsx`
- `src/app/happening-tonight/*`
- `src/app/scenes/[city]/page.tsx`
- `src/app/api/discovery/*`
- `src/app/api/analytics/benchmarks/route.ts`

### Gap

There is no dedicated room-fit endpoint or fan-facing UI that combines comedian attributes, venue quality, audience fit, scene context, accessibility, fairness, and freshness.

### Build next

1. Add a room-fit scorer that evaluates event, comedian, venue, city, and trust signals together.
2. Add explanation strings for why a room fits the comic and fan.
3. Add a "Best Room Tonight" module to home, discover, schedule, and city pages.
4. Add comedian and venue room-fit panels.
5. Add recommendation usefulness feedback.

### Acceptance criteria

- Each recommended event has a room-fit score and explanation.
- Target-city pages can show top room-fit recommendations for tonight.
- User feedback feeds discovery signals.
- Recommendations can explain trust and freshness, not just taste.

---

## 6. Workstream 3: Route Builder / Booking Intelligence

### Current hooks

- `src/lib/booking.ts`
- `src/app/api/bookings/route.ts`
- `src/app/api/bookings/availability/route.ts`
- `src/app/creator/bookings/page.tsx`
- `src/app/api/creator/bookings/route.ts`
- `src/lib/calendar-sync.ts`
- `src/app/api/calendar-feed/route.ts`
- `src/lib/scene-intelligence.ts`
- `src/lib/creator-intelligence.ts`
- `src/app/podcast-pipeline/page.tsx`
- `src/app/api/podcast-pipeline/*`
- `src/app/agent-portal/page.tsx`

### Gap

Booking primitives exist, but there is no multi-stop route builder, itinerary optimizer, hold/confirm workflow, drive-time logic, or route-to-calendar synthesis.

### Build next

1. Add route candidate generation by comedian, target cities, dates, and venue fit.
2. Add booking intelligence reports with city fit, room fit, pricing bands, comparable shows, and confidence.
3. Add podcast-to-ticket attribution in booking context.
4. Add booker shortlists for comedians, venues, dates, and notes.
5. Add conflict checks for nearby shows, calendar conflicts, travel gaps, and market saturation.

### Acceptance criteria

- A booker can generate a route shortlist for a comedian.
- A comedian can see which target city and room should be prioritized next.
- Route reports include evidence, not just ranked results.
- Booking intelligence can be exported or shared.

---

## 7. Workstream 4: Narrow Ticketing Pilots

### Current hooks

- `src/lib/tickets.ts`
- `src/lib/fair-ticketing.ts`
- `src/lib/dynamic-pricing.ts`
- `src/lib/wallet-passes.ts`
- `src/app/api/tickets/purchase/route.ts`
- `src/app/api/tickets/scan/route.ts`
- `src/app/api/tickets/transfer/route.ts`
- `src/app/api/events/[id]/ticket-types/route.ts`
- `src/app/api/events/[id]/pricing/route.ts`
- `src/app/api/events/[id]/refund-policy/route.ts`
- `src/app/api/wallet/passes/route.ts`
- `src/components/TicketPurchaseWidget.tsx`
- `src/components/FairTicketingWidget.tsx`
- `src/components/WaitlistButton.tsx`
- `src/components/EventActionDock.tsx`

### Gap

Ticketing primitives are strong, but the pilot needs a unified flow and graph-first instrumentation.

### Build next

1. Choose 3-5 pilot venues in target cities.
2. Add a pilot-mode ticketing path that prioritizes transparent pricing, fair waitlist, QR scanning, and verified attendance.
3. Ensure purchases, scans, waitlist joins, transfers, refunds, and reviews generate graph signals.
4. Add a pilot venue dashboard that shows conversion, verified attendance, waitlist health, and post-show feedback.
5. Run expansion reviews before adding non-pilot venues.

### Acceptance criteria

- Pilot events can sell, scan, refund, transfer, and waitlist tickets end to end.
- Ticketing actions generate discovery and attendance signals.
- Pilot venues can see trust and conversion metrics.
- Expansion decisions are based on graph lift and partner retention.

---

## 8. Deferred Backlog

These are intentionally deferred unless they directly strengthen one of the five workstreams above.

| Area | Deferred until |
|---|---|
| Generic community | It improves freshness, verified attendance, or booking outcomes |
| DMs and live chat | They support booker/comic workflows or verified event coordination |
| Standalone short-form feed | Clip-to-ticket attribution proves demand |
| Broad POS / venue ops | A pilot venue requires it and it improves graph quality |
| International expansion | First five cities are deep and operationally repeatable |
| Broad horizontal marketplace | Route builder creates repeat booking demand |

---

## 9. First Sprint Backlog

### Sprint goal

Ship the first visible trusted-graph improvements without waiting for a large rebuild.

### Recommended tickets

1. Define freshness score inputs and thresholds.
2. Add a target-city constants module for NYC, LA, Chicago, Austin, and Philly.
3. Add stale-data query helpers for venues and events.
4. Add trust badges to event cards.
5. Add fair/accessibility filters to schedule and city surfaces.
6. Add room-fit score type definitions and a pure scoring helper.
7. Add a route-builder data contract and placeholder API route.
8. Add graph-signal instrumentation checklist for ticketing pilot actions.

### Definition of done

- Roadmap work is tied to concrete code paths.
- Freshness, trust, room fit, routing, and pilot ticketing each have a first implementation surface.
- Deferred backlog is visible enough to prevent accidental scope creep.
