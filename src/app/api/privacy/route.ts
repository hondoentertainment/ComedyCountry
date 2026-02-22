import { NextResponse } from "next/server";

/**
 * POST /api/privacy
 * GDPR data subject request endpoint.
 * Accepts: { type: "access" | "erasure" | "export", email?: string }
 *
 * We do not collect or store personal data from visitors. This endpoint
 * acknowledges requests and provides a standardized response for compliance.
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

  // We do not store user data. Acknowledge the request for compliance.
  const response = {
    received: true,
    requestId: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message:
      "Punchline Atlas does not collect or store personal data from visitors. " +
      "We have no data to provide, delete, or export. If you believe we hold your data, " +
      "please contact privacy@punchlineatlas.com with details.",
    processedAt: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
