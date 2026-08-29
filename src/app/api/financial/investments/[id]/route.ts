import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  getInvestmentById,
  updateInvestment,
  deleteInvestment,
} from "@/lib/dal/ledger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const investment = await getInvestmentById(userId, id);
    if (!investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    return NextResponse.json(investment);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch investment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.assetType !== undefined) updateData.assetType = body.assetType;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount) || 0;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.cadence !== undefined) updateData.cadence = body.cadence;
    if (body.investmentDay !== undefined) updateData.investmentDay = parseInt(body.investmentDay, 10);
    if (body.platform !== undefined) updateData.platform = body.platform ? body.platform.trim() : null;
    if (body.expectedReturnRate !== undefined) {
      updateData.expectedReturnRate = body.expectedReturnRate !== null && body.expectedReturnRate !== ""
        ? parseFloat(body.expectedReturnRate)
        : null;
    }
    if (body.currentValuation !== undefined) {
      updateData.currentValuation = body.currentValuation !== null && body.currentValuation !== ""
        ? parseFloat(body.currentValuation)
        : null;
    }
    if (body.status !== undefined) updateData.status = body.status;
    if (body.targetAssetId !== undefined) updateData.targetAssetId = body.targetAssetId;
    if (body.notes !== undefined) updateData.notes = body.notes ? body.notes.trim() : null;

    const updated = await updateInvestment(userId, id, updateData);
    if (!updated) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    try {
      const { syncInvestmentWithNetWorthAsset } = await import("@/lib/ledger/investmentAccrual");
      await syncInvestmentWithNetWorthAsset(userId, updated);
    } catch (e) {
      console.warn("[investments/PATCH] Auto-sync to asset warning:", e);
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating investment:", error);
    return NextResponse.json({ error: "Failed to update investment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const deleted = await deleteInvestment(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete investment" }, { status: 500 });
  }
}
