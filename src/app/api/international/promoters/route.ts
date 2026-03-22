import { NextResponse } from "next/server";
import {
  getPromoterApplications,
  submitPromoterApplication,
} from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-promoters:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const country = searchParams.get("country") || undefined;

    const applications = await getPromoterApplications({ status, country });
    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch applications" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`international-promoters:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, city, country, countryCode } = body;

    if (!name || !email || !city || !country || !countryCode) {
      return NextResponse.json(
        { error: "name, email, city, country, and countryCode are required" },
        { status: 400 },
      );
    }

    const application = await submitPromoterApplication(body);
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit application" },
      { status: 500 },
    );
  }
}
