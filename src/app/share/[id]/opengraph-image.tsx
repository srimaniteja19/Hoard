import { ImageResponse } from "next/og";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeSigilLayout, resolveSigilToken, SigilShape } from "@/lib/sigil";

export const runtime = "nodejs";
export const alt = "HOARD collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SIGIL_SIZE = 380;

function renderShape(shape: SigilShape, fill: string, key: number) {
  const { kind, x, y, cell } = shape;
  switch (kind) {
    case 0:
      return <rect key={key} x={x} y={y} width={cell} height={cell} fill={fill} />;
    case 1: {
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      return <circle key={key} cx={cx} cy={cy} r={cell / 2} fill={fill} />;
    }
    case 2:
      return <path key={key} d={`M${x} ${y + cell}L${x + cell} ${y + cell}L${x + cell} ${y}Z`} fill={fill} />;
    default: {
      const ix = x + cell * 0.2;
      const iy = y + cell * 0.2;
      const iw = cell * 0.6;
      return <rect key={key} x={ix} y={iy} width={iw} height={iw} fill={fill} />;
    }
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [coll] = await db.select().from(collections).where(eq(collections.id, id));
  const name = coll?.name || "HOARD collection";

  const layout = computeSigilLayout(name, SIGIL_SIZE);
  const bgHex = resolveSigilToken(layout.bgToken);
  const accentHex = resolveSigilToken(layout.accentToken);
  const inkHex = resolveSigilToken("--ink");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          background: "#F4F0EA",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <svg viewBox={`0 0 ${SIGIL_SIZE} ${SIGIL_SIZE}`} width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <rect width={SIGIL_SIZE} height={SIGIL_SIZE} fill={bgHex} />
          {layout.shapes.map((shape, i) => renderShape(shape, shape.useAccent ? accentHex : inkHex, i))}
        </svg>

        <div style={{ display: "flex", flexDirection: "column", marginLeft: "56px", flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: 800,
              background: "#FFE600",
              color: "#000000",
              border: "4px solid #000000",
              padding: "6px 18px",
              width: "fit-content",
              marginBottom: "28px",
            }}
          >
            HOARD
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 800,
              color: "#000000",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
