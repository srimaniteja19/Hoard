import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserSubscriptions, createSubscription } from "@/lib/dal/ledger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const subs = await getUserSubscriptions(userId);
    return NextResponse.json({ subscriptions: subs });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.name || body.amount === undefined) {
      return NextResponse.json({ error: "Name and amount are required" }, { status: 400 });
    }

    const created = await createSubscription({
      userId,
      name: body.name.trim(),
      amount: parseFloat(body.amount) || 0,
      currency: body.currency || "USD",
      cadence: body.cadence || "MONTHLY",
      category: body.category || "SAAS",
      billingDay: body.billingDay ? parseInt(body.billingDay, 10) : 1,
      nextRenewalDate: body.nextRenewalDate || null,
      status: body.status || "ACTIVE",
      trialEndsDate: body.trialEndsDate || null,
      url: body.url ? body.url.trim() : null,
      notes: body.notes ? body.notes.trim() : null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
