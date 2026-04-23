# Trusted Comedy Graph Strategy

## Punchline Atlas

**Version:** 1.0  
**Last Updated:** April 22, 2026

---

## 1. Core Story

Punchline Atlas is not trying to be a generic all-in-one entertainment platform.

It is the **trusted comedy graph**: the product people use when they need the most reliable picture of what is happening in comedy right now.

That trust comes from six pillars already present in the product and codebase:

- **Fresh lineups:** shows, drops, open mics, surprise guests, and venue changes
- **Venue intel:** room quality, format, capacity, audience fit, and operator context
- **Scene intel:** city-by-city momentum, variety, loyalty, and scene health
- **Accessibility:** tagged and discoverable ASL, captioning, wheelchair access, and related metadata
- **Fair pricing:** transparent fees, anti-scalping controls, waitlists, and controlled resale
- **Podcast-to-ticket attribution:** proof of which content channels actually move live demand

---

## 2. Initial ICP

The first ideal customer profile is narrow on purpose.

### Primary users

- Independent comedy clubs
- Bookers and talent buyers
- Working comedians

### Initial city strategy

- New York City
- Los Angeles
- Chicago
- Austin
- Philadelphia

### Expansion rule

Do not optimize for nationwide breadth until these initial markets feel meaningfully deeper and fresher than the alternatives.

Success means users in target cities believe the product is more current and more trustworthy than venue sites, generic ticketing platforms, social feeds, or manual spreadsheets.

---

## 3. Product Principles

### 3.1 Freshness over surface area

If Punchline Atlas is more current than competitors on lineups, drops, open mics, and venue changes, users will forgive missing tabs.

### 3.2 Trust before engagement

The goal is not to maximize time-on-site with generic social features. The goal is to become the place users trust before they decide where to go, who to book, or how to route a tour.

### 3.3 Depth in key cities before national expansion

The product should feel indispensable in a few cities before it feels available everywhere.

### 3.4 Comedy-native workflows beat generic platform breadth

The moat comes from understanding how comedy is actually discovered, booked, routed, and attended.

---

## 4. Existing Assets To Productize

The repo already contains several unusually strong foundations for this strategy.

| Asset | Current location | Strategic role |
|------|------------------|----------------|
| Scene intelligence | `src/lib/scene-intelligence.ts` | Explain which scenes are growing, loyal, varied, and worth routing through |
| Fair ticketing / anti-scalping | `src/lib/fair-ticketing.ts` | Build fan and venue trust with transparent pricing and fair waitlist mechanics |
| Taste and discovery signals | `src/lib/discovery-engine.ts` | Personalize discovery using comedy-specific signals instead of generic event browse patterns |
| Creator revenue attribution | `src/lib/creator-intelligence.ts` | Show comedians and bookers which channels actually drive demand |
| Accessibility discovery | `src/app/accessible-shows/page.tsx` | Differentiate with trustworthy accessibility discovery that most competitors ignore |

---

## 5. Three Flagship Features

These should become the clearest expression of the trusted comedy graph.

### 5.1 Best Room For This Comic Tonight

Replace generic recommendation framing with a comedy-native decision tool.

**Who it serves:** fans, comedians, bookers

**Core job to be done:** decide where a comedian fits best tonight in a specific market

**Inputs**

- Discovery and taste signals
- Venue attributes
- Scene attributes
- Event quality and attendance signals
- Accessibility and pricing context

**Why it matters**

This shifts the product from "here are events you may like" to "here is the best room-context match for this comic and audience right now."

### 5.2 Route Builder / Booking Intelligence

Help comedians and bookers answer the operational questions that still live in text threads and spreadsheets.

**Who it serves:** working comedians, bookers, venue operators

**Core job to be done:** identify the best cities, rooms, dates, and audience fit for a run

**Inputs**

- Scene intelligence
- Venue intel
- Past attendance and pricing signals
- Podcast and audience attribution
- Upcoming market activity

**Why it matters**

This is a much stronger wedge than broad community or generic creator tooling because it maps directly to revenue decisions.

### 5.3 Fair + Accessible Show Discovery

Package trust explicitly for fans and venues.

**Who it serves:** fans, venue operators

**Core job to be done:** find shows that are both transparent and welcoming

**Inputs**

- Accessibility tags
- Fair price policies
- Fee breakdowns
- Waitlist and resale controls
- Venue metadata

**Why it matters**

This creates a distinctive promise that broad ticketing competitors rarely center and that comedy venues can proudly adopt.

---

## 6. 90-Day Direction

### 6.1 Data freshness loop

- Improve coverage for lineups, open mics, drops, cancellations, and venue changes in the target cities
- Build curator, venue, and comedian update loops that reduce stale data
- Track freshness as a first-class product metric

### 6.2 Trust packaging

- Expose fair pricing and accessibility more prominently in fan flows
- Make scene and venue intel visible enough to influence booking and attendance decisions
- Add clearer explanations to discovery outputs so recommendations feel earned, not opaque

### 6.3 City-depth execution

- Build city scorecards for NYC, LA, Chicago, Austin, and Philly
- Create operator and booker workflows around room fit and routing
- Avoid launching additional broad feature categories unless they improve trust or freshness

---

## 7. Recommended Roadmap Sequence

The product roadmap should be sequenced by graph leverage, not by broad platform category.

| Sequence | Workstream | Why it comes now |
|---|---|---|
| 0 | Freshness Infrastructure | Freshness is the moat that makes every downstream experience trustworthy. |
| 1 | Fair + Accessible Discovery | These trust signals already exist in the codebase and are visibly differentiated. |
| 2 | Best Room For This Comic Tonight | This turns generic discovery into a comedy-native decision tool. |
| 3 | Route Builder / Booking Intelligence | This creates the strongest B2B wedge for bookers and working comedians. |
| 4 | Narrow Ticketing Pilots | Ticketing should expand only where it improves graph data and venue trust. |

See [FEATURE-ROADMAP.md](./FEATURE-ROADMAP.md) for the execution-level roadmap.

---

## 8. Product Narrative

When describing Punchline Atlas externally, lead with:

> Punchline Atlas is the trusted comedy graph: the most reliable way to understand what is happening across comedians, venues, scenes, pricing, accessibility, and live demand.

Then support it with:

- For fans: find the right room, not just any ticket
- For comedians: understand where your audience converts and where to route next
- For clubs and bookers: trust the market intel behind programming decisions

---

## 9. Non-Goals For Now

- Competing head-on as a generic all-in-one events marketplace
- Expanding broad social surface area without improving trust or freshness
- Chasing national coverage before target-city depth is strong
- Adding new tabs that do not strengthen the comedy graph
- Generic community, DMs, live chat, fan clubs, and standalone short-form video unless they directly improve freshness, trust, attendance, or booking decisions
- Broad venue ops, POS, and international expansion until the first five cities are meaningfully deep

---

## 10. Strategic Test

Every major roadmap item should answer yes to at least one of these questions:

1. Does it make Punchline Atlas measurably fresher?
2. Does it make the comedy graph more trustworthy?
3. Does it improve booking, routing, or room-fit decisions?
4. Does it strengthen fair or accessible discovery?
5. Does it deepen one of the first target cities?

If not, it is probably not the next best thing to ship.
