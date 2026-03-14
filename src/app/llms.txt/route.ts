import { NextResponse } from "next/server";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export async function GET() {
  const content = `# Punchline Atlas

> The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.

Punchline Atlas is the most comprehensive comedy discovery platform, covering comedy clubs, theaters, open mics, and festivals across the United States.

## Core Features

- **Comedian Profiles**: Browse 1,800+ comedians with bios, genres, touring status, and upcoming shows
- **Venue Directory**: 150+ comedy venues across all 50 US states with reviews and ratings
- **Event Calendar**: Upcoming comedy shows with RSVP, ticket links, and calendar export
- **Trending**: Real-time trending comedians, hot shows, and popular venues
- **Comedy Specials**: Rate and discover stand-up specials from Netflix, HBO, YouTube, and more
- **Comedy Lists**: Spotify-style curated collections of comedians, venues, and events
- **Open Mic Finder**: Discover open mic nights near you
- **Festival Guide**: Comedy festival events and lineups
- **Comedian Comparison**: Compare comedians head-to-head
- **Group Planning**: Plan comedy nights with friends using shareable invite codes
- **City Comedy Scenes**: Local comedy guides for every city

## API for Agents

The Discovery API is available at: ${siteUrl}/api/discover

### Query Parameters
- \`type\`: "comedian" | "venue" | "event" | "all" (default: "all")
- \`q\`: Search query by name
- \`city\`: Filter by city
- \`state\`: Filter by US state
- \`limit\`: Results per type (default: 20, max: 50)

### Example Queries
- All comedians: ${siteUrl}/api/discover?type=comedian
- Venues in New York: ${siteUrl}/api/discover?type=venue&state=New%20York
- Events in Los Angeles: ${siteUrl}/api/discover?type=event&city=Los%20Angeles
- Search for a comedian: ${siteUrl}/api/discover?type=comedian&q=Dave%20Chappelle

## Key Pages

- Comedians: ${siteUrl}/comedians
- Venues: ${siteUrl}/venues
- Schedule: ${siteUrl}/schedule
- Trending: ${siteUrl}/trending
- Specials: ${siteUrl}/specials
- Open Mics: ${siteUrl}/open-mics
- Festivals: ${siteUrl}/festivals
- Comedy Lists: ${siteUrl}/lists
- Compare: ${siteUrl}/compare
- Map: ${siteUrl}/map

## OpenAPI Specification

Available at: ${siteUrl}/api/openapi.json
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
    },
  });
}
