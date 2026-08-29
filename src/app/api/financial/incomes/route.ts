import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserIncomes, createIncome } from "@/lib/dal/ledger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const incomes = await getUserIncomes(userId);
    return NextResponse.json({ incomes });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch incomes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.name || body.amount === undefined) {
      return NextResponse.json({ error: "Name and amount are required" }, { status: 400 });
    }

    const created = await createIncome({
      userId,
      name: body.name.trim(),
      amount: parseFloat(body.amount) || 0,
      cadence: body.cadence || "MONTHLY",
      category: body.category || "SALARY",
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      isPreTax: Boolean(body.isPreTax),
      country: body.country || "US",
      region: body.region || null,
      customTaxRate: body.customTaxRate !== undefined && body.customTaxRate !== null && body.customTaxRate !== "" ? parseFloat(body.customTaxRate) : null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating income:", error);
    return NextResponse.json({ error: "Failed to create income" }, { status: 500 });
  }
}
