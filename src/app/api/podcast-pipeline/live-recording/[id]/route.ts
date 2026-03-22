import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateRecordingStatus } from "@/lib/podcast-pipeline";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rl = await checkRateLimit(`podcast-pipeline-live-recording:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    const validStatuses = ["PLANNED", "RECORDING", "POST_PRODUCTION", "PUBLISHED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "status must be one of: " + validStatuses.join(", ") },
        { status: 400 },
      );
    }

    const updated = await updateRecordingStatus(params.id, status);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update recording status" }, { status: 500 });
  }
}
