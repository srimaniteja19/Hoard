import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserDebts, createDebt } from "@/lib/dal/ledger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const debts = await getUserDebts(userId);
    return NextResponse.json({ debts });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch debts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.name || body.balance === undefined || body.interestRate === undefined || body.minPayment === undefined) {
      return NextResponse.json(
        { error: "Name, balance, interestRate (APR), and minPayment are required" },
        { status: 400 }
      );
    }

    const created = await createDebt({
      userId,
      name: body.name.trim(),
      debtType: body.debtType || "CREDIT_CARD",
      balance: parseFloat(body.balance) || 0,
      originalPrincipal: body.originalPrincipal ? parseFloat(body.originalPrincipal) : parseFloat(body.balance) || 0,
      interestRate: parseFloat(body.interestRate) || 0,
      minPayment: parseFloat(body.minPayment) || 0,
      targetPayment: body.targetPayment ? parseFloat(body.targetPayment) : null,
      dueDay: body.dueDay ? parseInt(body.dueDay, 10) : 1,
      lender: body.lender ? body.lender.trim() : null,
      isPaidOff: Boolean(body.isPaidOff),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating debt:", error);
    return NextResponse.json({ error: "Failed to create debt" }, { status: 500 });
  }
}
