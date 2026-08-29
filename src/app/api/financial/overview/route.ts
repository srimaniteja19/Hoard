import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getFinancialOverview } from "@/lib/dal/ledger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const url = new URL(req.url);
    const extraPayment = parseFloat(url.searchParams.get("extraPayment") || "0") || 0;

    const overview = await getFinancialOverview(userId, extraPayment);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching financial overview:", error);
    return NextResponse.json({ error: "Failed to fetch financial overview" }, { status: 500 });
  }
}
