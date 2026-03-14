import { NextResponse } from "next/server";
import {
  getPromoterApplications,
  submitPromoterApplication,
} from "@/lib/international";

export async function GET(request: Request) {
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
