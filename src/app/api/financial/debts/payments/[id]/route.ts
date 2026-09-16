import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { deleteDebtPayment } from "@/lib/dal/ledger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const success = await deleteDebtPayment(userId, id);
    if (!success) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting debt payment:", error);
    return NextResponse.json({ error: "Failed to delete payment record" }, { status: 500 });
  }
}
