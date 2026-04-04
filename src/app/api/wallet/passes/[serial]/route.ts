import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getWalletPass,
  voidWalletPass,
  updatePassStatus,
} from "@/lib/wallet-passes";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serial: string }> },
) {
  const rl = await checkRateLimit(`wallet-passes:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { serial } = await params;
    const pass = await getWalletPass(serial);

    return NextResponse.json(pass);
  } catch (error) {
    if (error instanceof Error && error.message === "Wallet pass not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    logger.error(
      "GET /api/wallet/passes/[serial] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch wallet pass" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serial: string }> },
) {
  const rl = await checkRateLimit(`wallet-passes:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { serial } = await params;
    const body = await request.json();
    const { action, status } = body;

    let result;
    if (action === "void") {
      result = await voidWalletPass(serial);
    } else if (status) {
      result = await updatePassStatus(serial, status);
    } else {
      return NextResponse.json(
        { error: "Either action='void' or status is required" },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Wallet pass not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.message === "Pass is already voided" ||
        error.message.startsWith("Invalid status")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    logger.error(
      "PATCH /api/wallet/passes/[serial] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to update wallet pass" },
      { status: 500 },
    );
  }
}
