import { NextRequest, NextResponse } from "next/server";
import { getScrapAssetById } from "@/lib/dal/scratchAssets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await getScrapAssetById(id);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const imageBuffer = Buffer.from(asset.data, "base64");

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(imageBuffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[GET /api/scratch/assets/:id]", error);
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
  }
}
