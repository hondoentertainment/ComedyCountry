import { NextResponse } from "next/server";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Punchline Atlas API",
      description: "Comedy discovery platform API. Search comedians, venues, and events across the United States.",
      version: "1.0.0",
    },
    servers: [{ url: siteUrl }],
    paths: {
      "/api/discover": {
        get: {
          operationId: "discoverComedy",
          summary: "Search and discover comedians, venues, and comedy events",
          description: "Query the comedy database. Returns structured data about comedians, venues, and upcoming events. Supports filtering by type, search query, city, and state.",
          parameters: [
            {
              name: "type",
              in: "query",
              description: "Type of entity to search: comedian, venue, event, or all",
              schema: { type: "string", enum: ["all", "comedian", "venue", "event"], default: "all" },
            },
            {
              name: "q",
              in: "query",
              description: "Search query to filter results by name",
              schema: { type: "string" },
            },
            {
              name: "city",
              in: "query",
              description: "Filter venues and events by city name",
              schema: { type: "string" },
            },
            {
              name: "state",
              in: "query",
              description: "Filter venues and events by US state (e.g., 'California', 'NY')",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              description: "Maximum number of results per type (default 20, max 50)",
              schema: { type: "integer", default: 20, maximum: 50 },
            },
          ],
          responses: {
            "200": {
              description: "Successful response with comedy data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      _metadata: { type: "object" },
                      comedians: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            slug: { type: "string" },
                            bio: { type: "string", nullable: true },
                            genres: { type: "array", items: { type: "string" } },
                            touringStatus: { type: "string" },
                            followerCount: { type: "integer" },
                            profileUrl: { type: "string" },
                          },
                        },
                      },
                      venues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            city: { type: "string" },
                            state: { type: "string" },
                            type: { type: "string" },
                            capacity: { type: "integer", nullable: true },
                            profileUrl: { type: "string" },
                          },
                        },
                      },
                      events: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", nullable: true },
                            date: { type: "string", format: "date-time" },
                            venue: { type: "object" },
                            comedians: { type: "array" },
                            ticketUrl: { type: "string", nullable: true },
                            eventUrl: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/trending": {
        get: {
          operationId: "getTrending",
          summary: "Get trending comedians, hot shows, and popular venues",
          description: "Returns the most popular and trending comedy content right now.",
          responses: {
            "200": { description: "Trending comedy data" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: { "Cache-Control": "public, s-maxage=3600" },
  });
}
