import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { saveScrapAsset } from "@/lib/dal/scratchAssets";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const contentType = req.headers.get("content-type") || "";

    let filename = "til-image.webp";
    let mimeType = "image/webp";
    let base64Data = "";
    let sizeBytes = 0;
    let width: number | undefined;
    let height: number | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.data) {
        return NextResponse.json({ error: "Missing image data" }, { status: 400 });
      }

      filename = body.filename || "til-image.webp";
      mimeType = body.mimeType || "image/webp";
      width = body.width ? Number(body.width) : undefined;
      height = body.height ? Number(body.height) : undefined;

      let rawData = body.data as string;
      if (rawData.startsWith("data:")) {
        const matches = rawData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = rawData;
        }
      } else {
        base64Data = rawData;
      }

      const buffer = Buffer.from(base64Data, "base64");
      sizeBytes = buffer.length;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const widthVal = formData.get("width") as string | null;
      const heightVal = formData.get("height") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      filename = file.name || "til-image.webp";
      mimeType = file.type || "image/webp";
      sizeBytes = file.size;
      width = widthVal ? parseInt(widthVal, 10) : undefined;
      height = heightVal ? parseInt(heightVal, 10) : undefined;

      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
    } else {
      return NextResponse.json(
        { error: "Unsupported content type, expected JSON or multipart/form-data" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported image type: ${mimeType}. Allowed: PNG, JPEG, WebP, GIF, SVG, AVIF` },
        { status: 400 }
      );
    }

    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds maximum allowed size of 10MB" },
        { status: 400 }
      );
    }

    const asset = await saveScrapAsset(userId, {
      filename,
      mimeType,
      data: base64Data,
      sizeBytes,
      width,
      height,
    });

    const url = `/api/til/assets/${asset.id}`;

    return NextResponse.json(
      {
        id: asset.id,
        url,
        filename: asset.filename,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/til/assets]", error);
    const message = error instanceof Error ? error.message : "Failed to upload image asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
