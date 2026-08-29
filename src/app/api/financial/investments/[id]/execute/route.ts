import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { executeManualSIP } from "@/lib/ledger/investmentAccrual";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is allowed - uses default investment.amount
    }

    const customAmount = body.amount !== undefined && !isNaN(parseFloat(body.amount))
      ? parseFloat(body.amount)
      : undefined;

    const result = await executeManualSIP(userId, id, customAmount);

    return NextResponse.json({
      investment: result.investment,
      addedAmount: result.addedAmount,
      newTotal: result.newTotal,
      message: `Successfully executed SIP (+${result.addedAmount}). New valuation: ${result.newTotal}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[investments/execute] Error executing SIP:", msg, error);
    return NextResponse.json({ error: msg || "Failed to execute SIP" }, { status: 500 });
  }
}
