import React from "react";

export interface RepoCoverData {
  commits52: number[];
  languages: [string, number][];
  pushedDaysAgo: number;
}

interface RepoCoverProps {
  data: RepoCoverData;
}

/**
 * RepoCover — Kind-specific SVG cover for REPO bookmarks.
 * Renders 52 weekly commit bars, a multi-segment language bar, and pushed status.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const RepoCover: React.FC<RepoCoverProps> = ({ data }) => {
  const { commits52, languages, pushedDaysAgo } = data;
  const isArchived = pushedDaysAgo > 365;

  // Render 52 bars across 260px total width (x: 14 to x: 274)
  const barWidth = 3.5;
  const gap = 1.5;
  const startX = 14;
  const maxBarHeight = 32;
  const baselineY = 46;

  // Language bar calculation (x: 14 to x: 274 = 260px total width)
  const langWidthTotal = 260;
  const opacities = [0.95, 0.65, 0.35];
  const rawWidths = languages.map(([, pct]) => (pct / 100) * langWidthTotal);
  const langSegments = languages.map(([name, pct], idx) => ({
    name,
    pct,
    x: startX + rawWidths.slice(0, idx).reduce((sum, w) => sum + w, 0),
    w: Math.max(0, rawWidths[idx]),
    opacity: opacities[idx % 3],
  }));

  const langText = languages.map(([l, p]) => `${p}% ${l}`).join(" · ") || "Code";
  const pushedText = pushedDaysAgo === 0 ? "PUSHED TODAY" : `PUSHED ${pushedDaysAgo}D`;

  const ariaLabel = `Commit activity: ${isArchived ? "archived" : "active"}, last pushed ${pushedDaysAgo} days ago. Languages: ${langText}.`;

  return (
    <svg
      viewBox="0 0 288 104"
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <g opacity={isArchived ? 0.4 : 1}>
        {/* 52 Weekly Commit Activity Bars */}
        {commits52.slice(-52).map((val, idx) => {
          const h = Math.max(2, Math.round((val / 100) * maxBarHeight));
          const x = startX + idx * (barWidth + gap);
          const y = baselineY - h;
          const isQuiet = val <= 5;

          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={1}
              fill="currentColor"
              fillOpacity={isQuiet ? 0.2 : 0.85}
            />
          );
        })}

        {/* 3-Segment Language Bar */}
        <g transform="translate(0, 52)">
          <rect
            x={startX}
            y={0}
            width={langWidthTotal}
            height={6}
            rx={2}
            fill="currentColor"
            fillOpacity={0.15}
          />
          {langSegments.map((seg, idx) => (
            <rect
              key={idx}
              x={seg.x}
              y={0}
              width={seg.w}
              height={6}
              rx={idx === 0 ? 2 : 0}
              fill="currentColor"
              fillOpacity={seg.opacity}
            />
          ))}
        </g>

        {/* Footer Language Breakdown & Pushed Days Status */}
        <text
          x={startX}
          y={84}
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.9"
        >
          {langText.length > 28 ? `${langText.slice(0, 26)}...` : langText}
        </text>

        <text
          x={startX + langWidthTotal}
          y={84}
          textAnchor="end"
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.9"
        >
          {pushedText}
        </text>

        {/* Archived Indicator Marker */}
        {isArchived && (
          <text
            x={startX + langWidthTotal}
            y={22}
            textAnchor="end"
            fontFamily="var(--mono)"
            fontSize="9"
            fontWeight="900"
            fill="currentColor"
            letterSpacing="0.08em"
          >
            [ARCHIVED]
          </text>
        )}
      </g>
    </svg>
  );
};
