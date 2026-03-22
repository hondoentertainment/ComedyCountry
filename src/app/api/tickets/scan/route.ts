import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scanTicket } from "@/lib/tickets";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = await checkRateLimit(`tickets-scan:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { qrCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { qrCode } = body;
  if (!qrCode) {
    return NextResponse.json(
      { error: "qrCode is required" },
      { status: 400 }
    );
  }

  try {
    const result = await scanTicket(qrCode);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 }
    );
  }
}
