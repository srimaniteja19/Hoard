import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserAssets, createAsset } from "@/lib/dal/ledger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const assets = await getUserAssets(userId);
    return NextResponse.json({ assets });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.name || body.value === undefined) {
      return NextResponse.json({ error: "Name and value are required" }, { status: 400 });
    }

    const created = await createAsset({
      userId,
      name: body.name.trim(),
      category: body.category || "CASH_CHECKING",
      value: parseFloat(body.value) || 0,
      institution: body.institution ? body.institution.trim() : null,
      expectedYield: body.expectedYield ? parseFloat(body.expectedYield) : null,
      notes: body.notes ? body.notes.trim() : null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
