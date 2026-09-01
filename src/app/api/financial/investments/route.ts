import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserInvestments, createInvestment } from "@/lib/dal/ledger";
import {
  syncInvestmentWithNetWorthAsset,
  processAutomaticInvestmentAccruals,
} from "@/lib/ledger/investmentAccrual";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const rawInvestments = await getUserInvestments(userId);
    const investments = await processAutomaticInvestmentAccruals(userId, rawInvestments);
    return NextResponse.json({ investments });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch recurring investments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.name || body.amount === undefined) {
      return NextResponse.json({ error: "Name and amount are required" }, { status: 400 });
    }

    const created = await createInvestment({
      userId,
      name: body.name.trim(),
      assetType: body.assetType || "STOCKS_ETF",
      amount: Math.max(0, parseFloat(body.amount) || 0),
      currency: body.currency || "USD",
      cadence: body.cadence || "MONTHLY",
      investmentDay: body.investmentDay ? parseInt(body.investmentDay, 10) : 1,
      platform: body.platform ? body.platform.trim() : null,
      expectedReturnRate: body.expectedReturnRate !== undefined && body.expectedReturnRate !== null && body.expectedReturnRate !== ""
        ? parseFloat(body.expectedReturnRate) || 0
        : 8.0,
      currentValuation: body.currentValuation !== undefined && body.currentValuation !== null && body.currentValuation !== ""
        ? Math.max(0, parseFloat(body.currentValuation) || 0)
        : null,
      status: body.status || "ACTIVE",
      targetAssetId: body.targetAssetId || null,
      notes: body.notes ? body.notes.trim() : null,
    });

    // Auto-sync into Net Worth Assets table
    try {
      await syncInvestmentWithNetWorthAsset(userId, created);
    } catch (syncErr) {
      console.warn("[investments/POST] Auto-sync to asset warning:", syncErr);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error creating recurring investment:", msg, error);
    return NextResponse.json({ error: "Failed to create recurring investment" }, { status: 500 });
  }
}
