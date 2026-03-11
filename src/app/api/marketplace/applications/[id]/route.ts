import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { respondToApplication } from "@/lib/marketplace";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'accepted' or 'rejected'" },
        { status: 400 }
      );
    }

    const application = await respondToApplication(id, status);
    return NextResponse.json(application);
  } catch (error) {
    console.error("POST /api/marketplace/applications/[id] error:", error);
    return NextResponse.json({ error: "Failed to respond to application" }, { status: 500 });
  }
}
