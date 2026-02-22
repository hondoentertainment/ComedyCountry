import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserExport } from "@/lib/user-export";

/**
 * POST /api/privacy
 * GDPR data subject request endpoint.
 * Accepts: { type: "access" | "erasure" | "export", email?: string }
 *
 * Authenticated users: processes access/export and erasure directly.
 * Unauthenticated visitors: acknowledges request, provides instructions.
 */
export async function POST(request: Request) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { type?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { type, email? }" },
      { status: 400 }
    );
  }

  const type = body?.type as string | undefined;
  if (!type || !["access", "erasure", "export"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Must be one of: access, erasure, export" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const requestId = `pa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Authenticated: process GDPR request
  if (session?.user?.id) {
    const userId = session.user.id;

    if (type === "erasure") {
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json(
        {
          received: true,
          requestId,
          message: "Your account and all associated data have been permanently deleted. Please sign out if using a browser.",
          processedAt: new Date().toISOString(),
          action: "accountDeleted",
        },
        { status: 200 }
      );
    }

    if (type === "access" || type === "export") {
      const exportData = await buildUserExport(userId);
      if (!exportData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(
        {
          received: true,
          requestId,
          processedAt: new Date().toISOString(),
          data: exportData,
        },
        { status: 200 }
      );
    }
  }

  // Unauthenticated: acknowledge, provide instructions
  const response = {
    received: true,
    requestId,
    message:
      "Punchline Atlas does not collect or store personal data from visitors who have not created an account. " +
      "If you have an account, sign in and use Settings to export or delete your data, or contact privacy@punchlineatlas.com.",
    processedAt: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
