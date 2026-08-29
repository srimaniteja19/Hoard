import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getAssetById, updateAsset, deleteAsset } from "@/lib/dal/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const asset = await getAssetById(userId, id);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
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
    if (body.category !== undefined) patchData.category = body.category;
    if (body.value !== undefined) patchData.value = parseFloat(body.value);
    if (body.institution !== undefined) patchData.institution = body.institution ? body.institution.trim() : null;
    if (body.expectedYield !== undefined) patchData.expectedYield = body.expectedYield ? parseFloat(body.expectedYield) : null;
    if (body.notes !== undefined) patchData.notes = body.notes ? body.notes.trim() : null;

    const updated = await updateAsset(userId, id, patchData);
    if (!updated) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const success = await deleteAsset(userId, id);
    if (!success) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
