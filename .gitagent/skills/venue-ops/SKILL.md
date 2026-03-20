---
name: venue-ops
description: Build venue operations features — POS, capacity, staffing, menus, table management
license: MIT
allowed-tools: Read Edit Write Grep Glob Bash
metadata:
  author: hondoentertainment
  version: "1.0.0"
  category: venue-operations
---

# Venue Operations

## When to Use
When building or maintaining venue management features: POS integration, capacity tracking, staff scheduling, menu management, table layouts, drink minimums, walk-up sales, and comp lists.

## Key Models
- `TableLayout` — Seating arrangements per venue
- `DrinkMinimum` — Minimum spend rules by event/section
- `WalkUpSale` — Door sales tracking
- `CompListEntry` — Complimentary guest lists
- `StaffShift` — Staff scheduling
- `POSIntegration` — Square, Toast, Clover connections
- `VenueCapacityLog` — Real-time capacity tracking
- `MenuItem` — Food/drink menu items
- `PreOrder` — Advance orders for events

## API Endpoints
- `/api/venue-ops/` — Core operations CRUD
- `/api/venue-dashboard/` — Analytics and metrics
- `/api/venue-crm/` — Customer relationship management
- `/api/venue-groups/` — Multi-venue management

## Key Libraries
- `src/lib/venue-ops.ts` — Core operations logic
- `src/lib/pos-integration.ts` — POS system connectors
- `src/lib/venue-realtime.ts` — Real-time capacity updates
- `src/lib/menu-management.ts` — Menu CRUD

## POS Integration Pattern
Supported systems: Square, Toast, Clover
Each integration follows a standard adapter interface for syncing sales, inventory, and reporting data.
