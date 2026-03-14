import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getABTestResults,
  recordABTestImpression,
  recordABTestConversion,
} from "@/lib/marketing";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const results = await getABTestResults(params.id);
    return NextResponse.json(results);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch results";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { event, variant } = body;

    if (!event || !variant || !["A", "B"].includes(variant)) {
      return NextResponse.json(
        { error: "event (impression|conversion) and variant (A|B) are required" },
        { status: 400 },
      );
    }

    let result;
    if (event === "impression") {
      result = await recordABTestImpression(params.id, variant);
    } else if (event === "conversion") {
      result = await recordABTestConversion(params.id, variant);
    } else {
      return NextResponse.json(
        { error: "event must be 'impression' or 'conversion'" },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to record event";
    const status = msg.includes("not found") ? 404 : msg.includes("not running") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
