import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getSubscriptionById, updateSubscription, deleteSubscription } from "@/lib/dal/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const sub = await getSubscriptionById(userId, id);
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json(sub);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
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
    if (body.currency !== undefined) patchData.currency = body.currency;
    if (body.cadence !== undefined) patchData.cadence = body.cadence;
    if (body.category !== undefined) patchData.category = body.category;
    if (body.billingDay !== undefined) patchData.billingDay = parseInt(body.billingDay, 10);
    if (body.nextRenewalDate !== undefined) patchData.nextRenewalDate = body.nextRenewalDate;
    if (body.status !== undefined) patchData.status = body.status;
    if (body.trialEndsDate !== undefined) patchData.trialEndsDate = body.trialEndsDate;
    if (body.url !== undefined) patchData.url = body.url ? body.url.trim() : null;
    if (body.notes !== undefined) patchData.notes = body.notes ? body.notes.trim() : null;

    const updated = await updateSubscription(userId, id, patchData);
    if (!updated) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const success = await deleteSubscription(userId, id);
    if (!success) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }
}
