import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { fetchLinkPreview } from "@/lib/til/previewRegistry";
import { LinkPreview } from "@/db/schema";

// 7-day in-memory preview cache
const PREVIEW_CACHE = new Map<string, { preview: LinkPreview; expiresAt: number }>();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Per-user rate limiting (max 30 requests per minute)
const USER_RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRecord = USER_RATE_LIMITS.get(userId);

  if (!userRecord || now > userRecord.resetAt) {
    USER_RATE_LIMITS.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (userRecord.count >= 30) {
    return false;
  }

  userRecord.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: "Rate limit exceeded (max 30 requests/min)" }, { status: 429 });
    }

    const body = await req.json();
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "Missing or invalid url parameter" }, { status: 400 });
    }

    // Clean canonical key for cache
    const cacheKey = rawUrl.trim().toLowerCase().replace(/\/$/, "");

    const cached = PREVIEW_CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.preview);
    }

    const preview = await fetchLinkPreview(rawUrl);

    // Cache result if not a hard error
    PREVIEW_CACHE.set(cacheKey, {
      preview,
      expiresAt: Date.now() + SEVEN_DAYS_MS,
    });

    return NextResponse.json(preview);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/preview]", e);
    return NextResponse.json(
      {
        provider: "GENERIC",
        kind: "article",
        url: "",
        title: "Preview resolution failed",
        host: "unknown",
        fetchedAt: new Date().toISOString(),
        failed: true,
        meta: {},
      },
      { status: 200 }
    );
  }
}
