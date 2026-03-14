import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeAccessibilityTag, verifyAccessibilityTag } from "@/lib/accessibility";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const tag = await removeAccessibilityTag(id);

    return NextResponse.json(tag);
  } catch (error) {
    if (error instanceof Error && error.message === "Accessibility tag not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("DELETE /api/accessibility/tags/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to remove accessibility tag" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const tag = await verifyAccessibilityTag(id, session.user.id);

    return NextResponse.json(tag);
  } catch (error) {
    if (error instanceof Error && error.message === "Accessibility tag not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("PATCH /api/accessibility/tags/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to verify accessibility tag" },
      { status: 500 },
    );
  }
}
