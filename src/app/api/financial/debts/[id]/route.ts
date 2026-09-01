import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getDebtById, updateDebt, deleteDebt } from "@/lib/dal/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const debt = await getDebtById(userId, id);
    if (!debt) return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    return NextResponse.json(debt);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch debt" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();

    const patchData: Record<string, unknown> = {};
    if (body.name !== undefined) patchData.name = body.name.trim();
    if (body.debtType !== undefined) patchData.debtType = body.debtType;
    if (body.balance !== undefined) {
      const b = Math.max(0, parseFloat(body.balance) || 0);
      patchData.balance = b;
      if (b <= 0) patchData.isPaidOff = true;
    }
    if (body.originalPrincipal !== undefined) patchData.originalPrincipal = Math.max(0, parseFloat(body.originalPrincipal) || 0);
    if (body.interestRate !== undefined) patchData.interestRate = Math.max(0, parseFloat(body.interestRate) || 0);
    if (body.minPayment !== undefined) patchData.minPayment = Math.max(0, parseFloat(body.minPayment) || 0);
    if (body.targetPayment !== undefined) patchData.targetPayment = body.targetPayment ? Math.max(0, parseFloat(body.targetPayment) || 0) : null;
    if (body.dueDay !== undefined) patchData.dueDay = parseInt(body.dueDay, 10);
    if (body.lender !== undefined) patchData.lender = body.lender ? body.lender.trim() : null;
    if (body.isPaidOff !== undefined) patchData.isPaidOff = Boolean(body.isPaidOff);

    const updated = await updateDebt(userId, id, patchData);
    if (!updated) return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update debt" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const success = await deleteDebt(userId, id);
    if (!success) return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete debt" }, { status: 500 });
  }
}
