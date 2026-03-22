import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

const authHandler = NextAuth(authOptions);

async function withRateLimit(request: NextRequest, ...args: unknown[]) {
  const rl = await checkRateLimit(`auth:${getRateLimitKey(request)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  return authHandler(request, ...args);
}

export { withRateLimit as GET, withRateLimit as POST };
