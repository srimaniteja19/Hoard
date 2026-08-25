import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getSavedPostcard } from "@/lib/dal/postcards";

export const runtime = "nodejs";

const KIND_COLORS_HEX: Record<string, { bg: string; text: string }> = {
  FRAGMENT: { bg: "#00F0FF", text: "#0A0A0A" },
  QUESTION: { bg: "#FFE94A", text: "#0A0A0A" },
  QUOTE: { bg: "#7C4DFF", text: "#FFFFFF" },
  ACTION: { bg: "#A8E85C", text: "#0A0A0A" },
  RANT: { bg: "#FF3D8A", text: "#FFFFFF" },
  IDEA: { bg: "#FF3D8A", text: "#FFFFFF" },
  LOG: { bg: "#00F0FF", text: "#0A0A0A" },
  INK: { bg: "#FFE94A", text: "#0A0A0A" },
};

function cleanHighlightForImage(raw?: string | null): string {
  if (!raw) return "";
  let clean = raw.trim();

  // If the content is purely images, display a clean photo badge indicator
  if (/^(!\[.*?\]\(.*?\)\s*)+$/.test(clean)) {
    const count = (clean.match(/!\[.*?\]\(.*?\)/g) || []).length;
    return count > 1 ? `📸 [${count} Image Assets Saved]` : `📸 [1 Image Asset Saved]`;
  }

  // Replace image tags with [Image]
  clean = clean.replace(/!\[.*?\]\(.*?\)/g, " [Image] ");
  // Replace markdown links with text
  clean = clean.replace(/\[(.*?)\]\(.*?\)/g, "$1");
  // Clean header hashes
  clean = clean.replace(/^#+\s+/gm, "");

  if (clean.length > 280) {
    clean = clean.slice(0, 277) + "...";
  }

  return clean.trim();
}

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

    const tallyEntries = Object.entries(postcard.kindTallies as Record<string, number>).sort(
      (a, b) => b[1] - a[1]
    );

    const highlightText = cleanHighlightForImage(postcard.highlightContent);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#FFFDF7",
            padding: "54px 60px",
            fontFamily: "sans-serif",
            border: "24px solid #0A0A0A",
            justifyContent: "space-between",
          }}
        >
          {/* ── TOP HEADER + POSTAL STAMP ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "6px solid #0A0A0A",
              paddingBottom: "36px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "24px",
                    fontWeight: 900,
                    background: "#FFE94A",
                    color: "#0A0A0A",
                    border: "4px solid #0A0A0A",
                    padding: "6px 18px",
                    boxShadow: "4px 4px 0 #0A0A0A",
                  }}
                >
                  📮 AIRMAIL
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "20px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    color: "#7C4DFF",
                  }}
                >
                  SCRATCH WEEKLY POSTCARD
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: "52px",
                  fontWeight: 900,
                  color: "#0A0A0A",
                  letterSpacing: "-0.03em",
                }}
              >
                {postcard.weekStart} – {postcard.weekEnd}
              </div>
            </div>

            {/* Stamp */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "4px dashed #0A0A0A",
                padding: "12px 20px",
                background: "#F4F1EA",
                boxShadow: "4px 4px 0 rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ display: "flex", fontSize: "16px", fontWeight: 900, color: "#FF3D8A" }}>
                HOARD
              </div>
              <div style={{ display: "flex", fontSize: "36px" }}>📬</div>
              <div style={{ display: "flex", fontSize: "14px", fontWeight: 700, color: "#0A0A0A" }}>
                ≋≋≋
              </div>
            </div>
          </div>

          {/* ── METRIC PILLS ROW ── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: 800,
                background: "#F4F1EA",
                color: "#0A0A0A",
                border: "4px solid #0A0A0A",
                padding: "10px 20px",
                boxShadow: "4px 4px 0 #0A0A0A",
              }}
            >
              📦 {postcard.totalCount} SCRAPS
            </div>

            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: 800,
                background: "#F4F1EA",
                color: "#0A0A0A",
                border: "4px solid #0A0A0A",
                padding: "10px 20px",
                boxShadow: "4px 4px 0 #0A0A0A",
              }}
            >
              📅 {postcard.daysLogged}/7 DAYS LOGGED
            </div>

            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: 800,
                background: "#FFE94A",
                color: "#0A0A0A",
                border: "4px solid #0A0A0A",
                padding: "10px 20px",
                boxShadow: "4px 4px 0 #0A0A0A",
              }}
            >
              🔥 {postcard.currentStreak}-DAY STREAK
            </div>

            {postcard.previousWeekTotal > 0 && (
              <div
                style={{
                  display: "flex",
                  fontSize: "24px",
                  fontWeight: 800,
                  background:
                    postcard.totalCount >= postcard.previousWeekTotal ? "#A8E85C" : "#FF3D8A",
                  color:
                    postcard.totalCount >= postcard.previousWeekTotal ? "#0A0A0A" : "#FFFFFF",
                  border: "4px solid #0A0A0A",
                  padding: "10px 20px",
                  boxShadow: "4px 4px 0 #0A0A0A",
                }}
              >
                {postcard.totalCount >= postcard.previousWeekTotal ? "📈 +" : "📉 "}
                {postcard.totalCount - postcard.previousWeekTotal} VS LAST WK
              </div>
            )}
          </div>

          {/* ── KIND TALLIES ── */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                color: "#0A0A0A",
                opacity: 0.6,
                marginBottom: "14px",
              }}
            >
              ACTIVITY BREAKDOWN
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {tallyEntries.map(([kind, count]) => {
                const meta = KIND_COLORS_HEX[kind] || { bg: "#F4F1EA", text: "#0A0A0A" };
                return (
                  <div
                    key={kind}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "22px",
                      fontWeight: 800,
                      background: meta.bg,
                      color: meta.text,
                      border: "3.5px solid #0A0A0A",
                      padding: "8px 18px",
                      boxShadow: "3px 3px 0 #0A0A0A",
                    }}
                  >
                    <span>{kind}</span>
                    <span
                      style={{
                        background: "rgba(0,0,0,0.18)",
                        padding: "2px 8px",
                        fontSize: "20px",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── HIGHLIGHT CARD ── */}
          {highlightText ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#F4F1EA",
                border: "5px solid #0A0A0A",
                boxShadow: "8px 8px 0 #7C4DFF",
                padding: "28px 32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#7C4DFF",
                  letterSpacing: "0.12em",
                  marginBottom: "10px",
                }}
              >
                ⭐ WEEKLY HIGHLIGHT ({postcard.highlightKind || "NOTE"})
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "28px",
                  lineHeight: 1.45,
                  fontWeight: 700,
                  color: "#0A0A0A",
                  fontStyle: "italic",
                }}
              >
                &ldquo;{highlightText}&rdquo;
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* ── FOOTER WATERMARK ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "3px solid #0A0A0A",
              paddingTop: "20px",
              fontSize: "18px",
              fontWeight: 800,
              color: "#0A0A0A",
              opacity: 0.5,
            }}
          >
            <div style={{ display: "flex" }}>HOARD SCRATCHBOOK</div>
            <div style={{ display: "flex" }}>GENERATED {new Date().toISOString().slice(0, 10)}</div>
          </div>
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
