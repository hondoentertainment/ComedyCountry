import { NextResponse } from "next/server";
import { updatePromoterStatus } from "@/lib/international";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be one of: pending, approved, rejected" },
        { status: 400 },
      );
    }

    const application = await updatePromoterStatus(id, status, notes);
    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update application" },
      { status: 500 },
    );
  }
}
