# Feature Roadmap - Trusted Comedy Graph Sequencing

## Punchline Atlas

**Version:** 2.0  
**Last Updated:** April 23, 2026

---

## 1. Strategic Reset

Punchline Atlas should sequence work around the trusted comedy graph, not around broad feature categories.

The roadmap now prioritizes features that make the graph:

- Fresher
- More trustworthy
- More useful for room-fit decisions
- More useful for booking and routing decisions
- Deeper in the first five target cities

The first ideal customer profile is independent clubs, bookers, and working comedians in:

- New York City
- Los Angeles
- Chicago
- Austin
- Philadelphia

---

## 2. Roadmap Filter

Every roadmap item must answer yes to at least one question:

1. Does it make Punchline Atlas measurably fresher?
2. Does it make the comedy graph more trustworthy?
3. Does it improve booking, routing, or room-fit decisions?
4. Does it strengthen fair or accessible discovery?
5. Does it deepen one of the first target cities?

Items that do not pass this filter should be deferred.

---

## 3. Recommended Sequence

| Sequence | Workstream | Timeframe | Outcome |
|---|---|---|---|
| 0 | Freshness Infrastructure | Days 0-30 | The graph knows what is fresh, stale, verified, and target-city complete |
| 1 | Fair + Accessible Discovery | Days 15-45 | Trust badges and accessible/fair discovery become visible in fan flows |
| 2 | Best Room For This Comic Tonight | Days 45-75 | Recommendations shift from generic "For You" to comedy-native room fit |
| 3 | Route Builder / Booking Intelligence | Days 60-90 | Bookers and comedians can evaluate city, room, date, and audience fit |
| 4 | Narrow Ticketing Pilots | Days 75-120 | Ticketing feeds the graph with purchase, waitlist, attendance, and pricing data |

These workstreams can overlap, but they should stay sequenced by dependency. Freshness powers trust; trust powers room fit; room fit powers booking intelligence; ticketing pilots supply high-value conversion data.

---

## 4. Workstream 0: Freshness Infrastructure

**Goal:** Make data freshness a first-class product surface and operating metric.

### Why now

Freshness is the clearest wedge against broad live-event platforms. If Punchline Atlas has the most current comedy lineups, drops, open mics, cancellations, and venue changes in target cities, it becomes useful before it becomes comprehensive.

### Scope

| ID | Feature | Priority | Description |
|---|---|---|---|
| F-01 | Five-city coverage dashboard | Critical | Track venue, comedian, event, open mic, accessibility, and fair-pricing coverage for NYC, LA, Chicago, Austin, and Philly. |
| F-02 | Freshness score | Critical | Compute freshness by entity using last verified date, source quality, change velocity, and completeness. |
| F-03 | Stale-data queue | Critical | Surface events, venues, lineups, and open mics that need verification or cleanup. |
| F-04 | Source registry | High | Track venue sites, comedian sites, social links, ticketing links, podcasts, and trusted curator sources. |
| F-05 | Curator update workflow | High | Give internal operators a simple queue for validating changes and marking records verified. |
| F-06 | Venue/comedian self-update flow | High | Let claimed profiles submit corrections, lineup changes, and accessibility/fair-pricing updates. |
| F-07 | Last verified metadata | High | Show "last verified" and source confidence in admin, city, venue, and event views. |
| F-08 | Freshness alerts | Medium | Notify curators when target-city records become stale or high-priority events change. |

### Existing assets to reuse

- `src/app/admin/*`
- `src/app/api/admin/*`
- `src/app/api/import/route.ts`
- `src/lib/import.ts`
- `src/lib/scene-intelligence.ts`
- `prisma/schema.prisma`

### Key metrics

- Target-city venue coverage
- Target-city upcoming event coverage
- Percent of upcoming events verified in last 7 days
- Median record age by city
- Stale queue size
- Correction-to-publish time

---

## 5. Workstream 1: Fair + Accessible Discovery

**Goal:** Make trust visible to fans and valuable to venues.

### Why now

Fair pricing and accessibility are already represented in the codebase. They are also clearer differentiators than another generic social or content feature.

### Scope

| ID | Feature | Priority | Description |
|---|---|---|---|
| FA-01 | Fair/accessibility badges on event cards | Critical | Show accessibility tags, transparent pricing, waitlist, and anti-scalping status on event cards. |
| FA-02 | Fair price breakdown in purchase flow | Critical | Make base price, service fee, processing fee, and total visible before checkout. |
| FA-03 | Accessible city pages | High | Add target-city landing modules for accessible shows and accessible venues. |
| FA-04 | Venue trust panel | High | Add a venue-level panel summarizing accessibility, pricing transparency, waitlist policy, and last verified date. |
| FA-05 | Verified accessibility workflow | High | Let admins, venues, or trusted curators mark accessibility tags as verified. |
| FA-06 | Fair ticketing explainer | Medium | Explain transparent pricing, controlled resale, and waitlist redistribution in fan-facing language. |
| FA-07 | Trust filters | Medium | Let fans filter by ASL, captioning, wheelchair access, transparent fees, waitlist availability, and no-resale-markup. |

### Existing assets to reuse

- `src/app/accessible-shows/page.tsx`
- `src/components/AccessibilityBadge.tsx`
- `src/components/AccessibilityFilter.tsx`
- `src/lib/fair-ticketing.ts`
- `src/components/FairTicketingWidget.tsx`
- `src/app/api/fair-ticketing/*`
- `src/app/api/accessibility/*`

### Key metrics

- Accessible show impressions and clicks
- Events with verified accessibility tags
- Events with fair price policies
- Event-card conversion lift from trust badges
- Filter usage by trust attribute

---

## 6. Workstream 2: Best Room For This Comic Tonight

**Goal:** Replace generic recommendations with comedy-native room-fit decisions.

### Why now

"For You" is table stakes. "Best room for this comic tonight" is a stronger promise because it combines taste, venue fit, scene context, pricing, accessibility, and freshness.

### Scope

| ID | Feature | Priority | Description |
|---|---|---|---|
| BR-01 | Room-fit score | Critical | Score event-comedian-venue fit using comedian attributes, venue type, city scene data, audience signals, pricing, accessibility, and freshness. |
| BR-02 | Recommendation explanations | Critical | Explain why an event is recommended, including room fit, scene fit, trust signals, and freshness. |
| BR-03 | Tonight decision surface | High | Create a target-city "best room tonight" module for home, discover, city, and schedule pages. |
| BR-04 | Comedian room-fit panel | High | On comedian pages, show best-fit venues and upcoming shows by target city. |
| BR-05 | Venue room-fit panel | Medium | On venue pages, show which comedian types fit the room and why. |
| BR-06 | Feedback loop | Medium | Let users mark recommendations as useful/not useful and feed that signal into discovery. |

### Existing assets to reuse

- `src/lib/discovery-engine.ts`
- `src/lib/comedy-genome.ts`
- `src/lib/scene-intelligence.ts`
- `src/lib/event-insights.ts`
- `src/components/DiscoveryFeed.tsx`
- `src/app/discover/page.tsx`
- `src/app/happening-tonight/*`
- `src/app/api/discovery/*`

### Key metrics

- Recommendation click-through rate
- "Worth leaving the house for" feedback
- Ticket click or purchase conversion from room-fit modules
- Repeat usage in target cities
- Explanation helpfulness feedback

---

## 7. Workstream 3: Route Builder / Booking Intelligence

**Goal:** Give bookers and working comedians an operational tool they cannot get from generic ticketing platforms.

### Why now

This is the strongest B2B wedge because it maps directly to revenue decisions: where to play, who to book, which dates work, and which audience channels convert.

### Scope

| ID | Feature | Priority | Description |
|---|---|---|---|
| RB-01 | Route candidate generator | Critical | Suggest target cities and venues for a comedian based on scene strength, venue fit, audience signals, and upcoming availability. |
| RB-02 | Booking intelligence report | Critical | Summarize expected room fit, audience fit, pricing range, comparable shows, and confidence level. |
| RB-03 | Podcast-to-ticket attribution view | High | Show which podcast episodes, clips, and content sources drive ticket clicks or purchases. |
| RB-04 | Booker shortlist | High | Let bookers save candidate comedians, venues, dates, and notes for review. |
| RB-05 | Routing conflict checks | Medium | Flag date conflicts, market saturation, travel gaps, and nearby competing shows. |
| RB-06 | Pilot export | Medium | Export a shareable route/booking brief for comedians, bookers, and agents. |

### Existing assets to reuse

- `src/lib/scene-intelligence.ts`
- `src/lib/creator-intelligence.ts`
- `src/lib/podcast-pipeline/*` or `src/lib/podcast-pipeline.ts`
- `src/app/podcast-pipeline/page.tsx`
- `src/app/creator-intelligence/page.tsx`
- `src/app/marketplace/*`
- `src/app/agent-portal/page.tsx`
- `src/app/api/creator-intelligence/*`
- `src/app/api/podcast-pipeline/*`

### Key metrics

- Route reports generated
- Booker shortlists created
- Booking requests sent
- Booking request acceptance rate
- Podcast/content source conversion attribution
- Pilot user retention

---

## 8. Workstream 4: Narrow Ticketing Pilots

**Goal:** Use ticketing to enrich the graph, not to become a generic ticketing platform.

### Why now

Native ticketing is valuable when it supplies purchase, waitlist, attendance, refund, resale, and pricing data. It should start with a small number of trusted target-city partners.

### Scope

| ID | Feature | Priority | Description |
|---|---|---|---|
| TP-01 | Pilot venue selection | Critical | Choose 3-5 target-city venues where native ticketing can improve data quality and trust. |
| TP-02 | Graph-first purchase instrumentation | Critical | Ensure ticket purchases generate discovery, attendance, price, waitlist, and review signals. |
| TP-03 | Fair waitlist pilot | High | Use FIFO waitlist and redistribution for sold-out shows at pilot venues. |
| TP-04 | Door scan feedback loop | High | Convert scans into verified attendance and post-show feedback prompts. |
| TP-05 | Transparent pricing pilot | High | Make all fees visible and log price transparency for pilot events. |
| TP-06 | Pilot success review | Medium | Decide whether ticketing should expand based on graph lift, trust lift, and venue retention. |

### Existing assets to reuse

- `src/lib/tickets.ts`
- `src/lib/fair-ticketing.ts`
- `src/lib/dynamic-pricing.ts`
- `src/lib/wallet-passes.ts`
- `src/app/api/tickets/*`
- `src/app/api/stripe/*`
- `src/app/tickets/*`
- `src/components/TicketPurchaseWidget.tsx`
- `src/components/WaitlistButton.tsx`

### Key metrics

- Pilot venue activation
- Ticket purchase conversion
- Verified attendance rate
- Waitlist claim rate
- Post-show feedback rate
- Incremental discovery signal volume

---

## 9. De-Prioritized Work

These items are not abandoned, but they should wait until they clearly strengthen the trusted comedy graph.

| Area | Current recommendation | Reason |
|---|---|---|
| Generic community | Defer | Discussions, DMs, fan clubs, and live chat do not matter unless they improve trust, attendance, or freshness. |
| Standalone short-form feed | Defer | Keep clip-to-ticket attribution, but do not build a generic TikTok-style destination yet. |
| Broad venue ops and POS | Pilot only | Build only what target-city launch partners need for freshness, trust, or ticket data. |
| International expansion | Defer | Win depth in the first five cities before globalizing. |
| Generic creator monetization | Narrow | Prioritize routing, attribution, and booking intelligence over Patreon-style content features. |
| Horizontal marketplace | Narrow | Build booker workflows first; avoid a broad two-sided marketplace before supply quality is proven. |

---

## 10. 90-Day Execution Plan

### Days 0-15: Roadmap and data baseline

- Define freshness score fields and stale-data rules.
- Audit NYC, LA, Chicago, Austin, and Philly coverage.
- Identify 25-50 high-priority venues and recurring shows per city.
- Pick initial trust badges for event cards.
- Select 5-10 pilot users across clubs, bookers, and working comedians.

### Days 15-45: Freshness and trust release

- Ship stale-data queue and last-verified metadata.
- Add fair/accessibility badges to event cards and venue pages.
- Improve accessible show/city discovery.
- Add target-city freshness dashboards.
- Start weekly curator verification loops.

### Days 45-75: Room-fit release

- Ship room-fit score and recommendation explanations.
- Add "Best Room For This Comic Tonight" to discovery and target-city surfaces.
- Add user feedback on recommendation usefulness.
- Measure conversion lift from room-fit explanations.

### Days 60-90: B2B pilot release

- Ship route builder MVP for pilot comedians and bookers.
- Add booking intelligence reports.
- Add podcast-to-ticket attribution views where data exists.
- Collect pilot feedback and booking outcomes.

### Days 75-120: Ticketing pilot

- Activate native ticketing only for selected pilot venues.
- Instrument purchases, scans, waitlists, and post-show feedback as graph signals.
- Decide whether to expand ticketing based on graph lift and partner retention.

---

## 11. Success Criteria

The roadmap is working if, within the first target cities:

- Upcoming shows are fresher than venue sites, social feeds, or generic ticketing platforms.
- Users can see why an event is trusted, accessible, and fairly priced.
- Fans use room-fit explanations to choose shows.
- Bookers and comedians use route reports in real booking conversations.
- Ticketing pilots generate useful graph data rather than just checkout revenue.

---

## 12. Roadmap Summary

| Priority | Ship next | Defer |
|---|---|---|
| 1 | Freshness infrastructure | International expansion |
| 2 | Fair + accessible discovery | Generic community/social |
| 3 | Best Room For This Comic Tonight | Standalone short-form feed |
| 4 | Route Builder / Booking Intelligence | Broad POS/venue ops |
| 5 | Narrow ticketing pilots | Broad horizontal marketplace |
