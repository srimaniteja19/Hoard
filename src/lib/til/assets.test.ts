import { describe, it, expect, vi } from "vitest";
import { POST as uploadAsset } from "@/app/api/til/assets/route";
import { GET as getAsset } from "@/app/api/til/assets/[id]/route";
import { NextRequest } from "next/server";

// Mock session
vi.mock("@/lib/session", () => ({
  requireUserId: vi.fn().mockResolvedValue("usr_test_123"),
  AuthError: class AuthError extends Error {},
}));

const mockAssetStore = new Map<string, any>();

// Mock DAL
vi.mock("@/lib/dal/scratchAssets", () => ({
  saveScrapAsset: vi.fn().mockImplementation(async (userId, params) => {
    const asset = {
      id: "asset_test_uuid",
      userId,
      filename: params.filename,
      mimeType: params.mimeType,
      data: params.data,
      sizeBytes: params.sizeBytes,
      width: params.width || null,
      height: params.height || null,
      createdAt: new Date(),
    };
    mockAssetStore.set(asset.id, asset);
    return asset;
  }),
  getScrapAssetById: vi.fn().mockImplementation(async (id: string) => {
    return mockAssetStore.get(id) || null;
  }),
}));

describe("TIL Assets API", () => {
  it("uploads a base64 image via JSON and retrieves it", async () => {
    // 1x1 transparent PNG base64
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const req = new NextRequest("http://localhost:3000/api/til/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: `data:image/png;base64,${base64Png}`,
        filename: "test-diagram.png",
        width: 1,
        height: 1,
      }),
    });

    const res = await uploadAsset(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("asset_test_uuid");
    expect(body.url).toBe("/api/til/assets/asset_test_uuid");
    expect(body.filename).toBe("test-diagram.png");

    // Fetch the asset via GET route
    const getReq = new NextRequest(`http://localhost:3000/api/til/assets/${body.id}`);
    const getRes = await getAsset(getReq, {
      params: Promise.resolve({ id: body.id }),
    });

    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toBe("image/png");
    const arrayBuf = await getRes.arrayBuffer();
    expect(arrayBuf.byteLength).toBeGreaterThan(0);
  });

  it("rejects unsupported file formats", async () => {
    const req = new NextRequest("http://localhost:3000/api/til/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: "data:application/pdf;base64,JVBERi0xLjQK...",
        mimeType: "application/pdf",
        filename: "document.pdf",
      }),
    });

    const res = await uploadAsset(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unsupported image type");
  });
});
