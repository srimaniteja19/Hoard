import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getSavedPostcard } from "@/lib/dal/postcards";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { weekStart } = await params;

    const postcard = await getSavedPostcard(userId, weekStart);
    if (!postcard) {
      return NextResponse.json({ error: "Postcard not generated yet" }, { status: 404 });
    }

    const tallyEntries = Object.entries(postcard.kindTallies as Record<string, number>);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#FFFDF7",
            padding: "60px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              fontWeight: 800,
              background: "#FFE94A",
              color: "#0A0A0A",
              border: "4px solid #0A0A0A",
              padding: "6px 18px",
              width: "fit-content",
              marginBottom: "24px",
            }}
          >
            SCRATCH POSTCARD
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "40px",
              fontWeight: 800,
              color: "#0A0A0A",
              marginBottom: "8px",
            }}
          >
            {postcard.weekStart} – {postcard.weekEnd}
          </div>

          <div style={{ display: "flex", fontSize: "22px", color: "#0A0A0A", marginBottom: "32px" }}>
            {postcard.totalCount} scraps · {postcard.daysLogged}/7 days logged · {postcard.currentStreak}-day streak
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginBottom: "32px" }}>
            {tallyEntries.map(([kind, count]) => (
              <div
                key={kind}
                style={{
                  display: "flex",
                  fontSize: "24px",
                  color: "#0A0A0A",
                  marginBottom: "6px",
                }}
              >
                {kind}: {count}
              </div>
            ))}
          </div>

          {postcard.highlightContent && (
            <div
              style={{
                display: "flex",
                background: "#7C4DFF",
                color: "#FFFFFF",
                padding: "24px",
                fontSize: "26px",
                border: "4px solid #0A0A0A",
              }}
            >
              {postcard.highlightContent}
            </div>
          )}
        </div>
      ),
      { width: 1080, height: 1350 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/scratch/postcard/:weekStart/image]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
