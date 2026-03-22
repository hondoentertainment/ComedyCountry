import { NextResponse } from "next/server";
import { updateCompStatus } from "@/lib/venue-ops";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`venue-ops-comp-list:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, approvedBy } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const entry = await updateCompStatus(id, status, approvedBy);
    return NextResponse.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const statusCode = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
