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
      const b = parseFloat(body.balance);
      patchData.balance = b;
      if (b <= 0) patchData.isPaidOff = true;
    }
    if (body.originalPrincipal !== undefined) patchData.originalPrincipal = parseFloat(body.originalPrincipal);
    if (body.interestRate !== undefined) patchData.interestRate = parseFloat(body.interestRate);
    if (body.minPayment !== undefined) patchData.minPayment = parseFloat(body.minPayment);
    if (body.targetPayment !== undefined) patchData.targetPayment = body.targetPayment ? parseFloat(body.targetPayment) : null;
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
