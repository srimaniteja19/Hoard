import { NextResponse } from "next/server";
import { db } from "@/db";
import { extensionTokens } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import crypto from "crypto";

// ─── GET /api/extension/tokens (List Tokens) ─────────────────────────────────

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);

    const rows = await db
      .select({
        id: extensionTokens.id,
        name: extensionTokens.name,
        scopes: extensionTokens.scopes,
        lastUsedAt: extensionTokens.lastUsedAt,
        createdAt: extensionTokens.createdAt,
      })
      .from(extensionTokens)
      .where(and(eq(extensionTokens.userId, userId), isNull(extensionTokens.revokedAt)))
      .orderBy(desc(extensionTokens.createdAt));

    const tokens = rows.map((r) => ({
      ...r,
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(tokens);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/extension/tokens]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/extension/tokens (Issue Token) ────────────────────────────────

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const name = (body.name || "Chrome Extension").trim().slice(0, 50);

    // Generate random 32-byte secret token with prefix
    const secretPart = crypto.randomBytes(32).toString("hex");
    const rawToken = `htk_${secretPart}`;

    // Compute SHA-256 hash for database storage
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const scopes = "til:write bookmark:write bookmark:read";

    const [inserted] = await db
      .insert(extensionTokens)
      .values({
        userId,
        name,
        tokenHash,
        scopes,
      })
      .returning();

    return NextResponse.json(
      {
        id: inserted.id,
        name: inserted.name,
        token: rawToken, // Returned ONLY ONCE on issue
        scopes: inserted.scopes,
        createdAt: inserted.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/extension/tokens]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/extension/tokens (Revoke Token) ────────────────────────────

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing token id parameter" }, { status: 400 });
    }

    const existing = await db
      .select({ id: extensionTokens.id })
      .from(extensionTokens)
      .where(and(eq(extensionTokens.id, id), eq(extensionTokens.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    await db
      .update(extensionTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(extensionTokens.id, id), eq(extensionTokens.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/extension/tokens]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
