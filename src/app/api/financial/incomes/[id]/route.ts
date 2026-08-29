import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getIncomeById, updateIncome, deleteIncome } from "@/lib/dal/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const income = await getIncomeById(userId, id);
    if (!income) return NextResponse.json({ error: "Income not found" }, { status: 404 });
    return NextResponse.json(income);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch income" }, { status: 500 });
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
    if (body.amount !== undefined) patchData.amount = parseFloat(body.amount);
    if (body.cadence !== undefined) patchData.cadence = body.cadence;
    if (body.category !== undefined) patchData.category = body.category;
    if (body.isActive !== undefined) patchData.isActive = Boolean(body.isActive);
    if (body.isPreTax !== undefined) patchData.isPreTax = Boolean(body.isPreTax);
    if (body.country !== undefined) patchData.country = body.country;
    if (body.region !== undefined) patchData.region = body.region;
    if (body.customTaxRate !== undefined) {
      patchData.customTaxRate = body.customTaxRate !== null && body.customTaxRate !== "" ? parseFloat(body.customTaxRate) : null;
    }

    const updated = await updateIncome(userId, id, patchData);
    if (!updated) return NextResponse.json({ error: "Income not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update income" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const success = await deleteIncome(userId, id);
    if (!success) return NextResponse.json({ error: "Income not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete income" }, { status: 500 });
  }
}
