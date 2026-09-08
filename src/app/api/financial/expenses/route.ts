import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  getUserDailyExpenses,
  createDailyExpense,
  deleteDailyExpense,
} from "@/lib/dal/ledger";
import { formatLocalDate, formatLocalTime } from "@/lib/ledger/dailyExpenses";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;

    const expenses = await getUserDailyExpenses(userId, month);
    return NextResponse.json({ expenses });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching daily expenses:", error);
    return NextResponse.json({ error: "Failed to fetch daily expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const note = body.note ? String(body.note).trim() : "";
    if (!note) {
      return NextResponse.json(
        { error: "Note / description is required" },
        { status: 400 }
      );
    }

    const category = body.category ? String(body.category).trim().toLowerCase() : "misc";
    const date = body.date && typeof body.date === "string" ? body.date : formatLocalDate();
    const time = body.time && typeof body.time === "string" ? body.time : formatLocalTime();
    const currency = body.currency ? String(body.currency).toUpperCase() : "USD";

    const created = await createDailyExpense({
      userId,
      amount,
      note,
      category,
      date,
      time,
      currency,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating daily expense:", error);
    return NextResponse.json({ error: "Failed to create daily expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    const success = await deleteDailyExpense(userId, id);
    if (!success) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting daily expense:", error);
    return NextResponse.json({ error: "Failed to delete daily expense" }, { status: 500 });
  }
}
