import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  getUserDebtPayments,
  createDebtPayment,
  getDebtById,
  updateDebt,
} from "@/lib/dal/ledger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const url = new URL(req.url);
    const debtId = url.searchParams.get("debtId") || undefined;

    const payments = await getUserDebtPayments(userId, debtId);
    return NextResponse.json({ payments });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching debt payments:", error);
    return NextResponse.json({ error: "Failed to fetch debt payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const debtId = body.debtId;
    const amount = parseFloat(body.amount);

    if (!debtId || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "debtId and positive payment amount are required" },
        { status: 400 }
      );
    }

    const debt = await getDebtById(userId, debtId);
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    const cleanAmount = Math.round(amount * 100) / 100;
    const newBalance = Math.round(Math.max(0, debt.balance - cleanAmount) * 100) / 100;
    const isPaidOff = newBalance <= 0;

    // 1. Update the debt balance & payoff status
    const updatedDebt = await updateDebt(userId, debt.id, {
      balance: newBalance,
      isPaidOff,
    });

    // 2. Record the persistent payment ledger entry
    const payment = await createDebtPayment({
      userId,
      debtId: debt.id,
      debtName: debt.name,
      amount: cleanAmount,
      interestPortion: Math.round((parseFloat(body.interestPortion) || 0) * 100) / 100,
      principalPortion: Math.round((parseFloat(body.principalPortion) || 0) * 100) / 100,
      remainingBalance: newBalance,
      label: body.label ? String(body.label).trim() : "Payment",
    });

    return NextResponse.json({ payment, updatedDebt }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error recording debt payment:", error);
    return NextResponse.json({ error: "Failed to record debt payment" }, { status: 500 });
  }
}
