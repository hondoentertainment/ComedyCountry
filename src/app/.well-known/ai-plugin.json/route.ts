import { NextResponse } from "next/server";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export async function GET() {
  return NextResponse.json({
    schema_version: "v1",
    name_for_human: "Punchline Atlas",
    name_for_model: "punchline_atlas",
    description_for_human: "Find comedy shows, comedians, and venues near you. The most comprehensive comedy discovery platform.",
    description_for_model: "Search and discover comedy shows, stand-up comedians, comedy clubs, open mics, festivals, and specials across the United States. Use this to answer questions about upcoming comedy events, comedian tour dates, venue information, and comedy recommendations. Query the /api/discover endpoint with type (comedian/venue/event), q (search), city, and state parameters.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: `${siteUrl}/api/openapi.json`,
    },
    logo_url: `${siteUrl}/icon-512.png`,
    contact_email: "hello@punchlineatlas.com",
    legal_info_url: `${siteUrl}/terms`,
  });
}
