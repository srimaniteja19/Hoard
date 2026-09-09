import { NextRequest, NextResponse } from "next/server";
import { validateUrlForSsrf, fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import { requireUserId, AuthError } from "@/lib/session";
import { extractHtmlTitle } from "@/lib/notebooks/blocks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid URL" }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // 1. SSRF Guard verification
    const ssrfCheck = await validateUrlForSsrf(trimmedUrl);
    if (!ssrfCheck.allowed) {
      return NextResponse.json(
        { error: ssrfCheck.reason || "URL is not allowed for security reasons." },
        { status: 403 }
      );
    }

    // 2. Fetch the target HTML content securely
    const fetchResult = await fetchWithSsrfGuard(trimmedUrl, 5);

    if (!fetchResult.ok || !fetchResult.text) {
      return NextResponse.json(
        { error: `Failed to fetch URL (HTTP ${fetchResult.status})` },
        { status: 502 }
      );
    }

    const rawHtml = fetchResult.text;
    const title = extractHtmlTitle(rawHtml) || "Imported Web Page";

    return NextResponse.json({
      success: true,
      html: rawHtml,
      title,
      url: trimmedUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Import HTML] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to import HTML from URL" },
      { status: 500 }
    );
  }
}
