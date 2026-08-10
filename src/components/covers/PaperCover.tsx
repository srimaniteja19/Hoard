import React from "react";

export interface PaperCoverData {
  pages: number;
  pagesRead: number;
}

interface PaperCoverProps {
  data: PaperCoverData;
}

/**
 * PaperCover — Kind-specific SVG cover for PPR (Academic Paper) bookmarks.
 * Renders a grid of page rectangles (capped at 24 max), filled for read pages,
 * with `{read} / {total} PAGES` in footer.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const PaperCover: React.FC<PaperCoverProps> = ({ data }) => {
  const { pages = 1, pagesRead = 0 } = data;
  const maxPagesVisual = 24;
  const displayTotal = Math.max(1, pages);
  const displayRead = Math.min(displayTotal, Math.max(0, pagesRead));

  // Determine scale ratio if total pages exceed 24
  const scale = displayTotal > maxPagesVisual ? maxPagesVisual / displayTotal : 1;
  const numVisualPages = Math.min(maxPagesVisual, Math.max(1, Math.round(displayTotal * scale)));
  const filledVisualPages = Math.round(displayRead * scale);

  const cols = 12;
  const rectW = 16;
  const rectH = 20;
  const gapX = 5;
  const gapY = 5;
  const startX = 16;
  const startY = 16;

  const ariaLabel = `Academic paper progress: ${displayRead} of ${displayTotal} pages read.`;

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
      <g>
        {/* Page Grid Rectangles */}
        {Array.from({ length: numVisualPages }).map((_, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const x = startX + c * (rectW + gapX);
          const y = startY + r * (rectH + gapY);
          const isFilled = idx < filledVisualPages;

          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={rectW}
              height={rectH}
              rx={2}
              fill="currentColor"
              fillOpacity={isFilled ? 0.85 : 0.1}
              stroke="currentColor"
              strokeWidth={1}
              strokeOpacity={isFilled ? 0.9 : 0.3}
            />
          );
        })}

        {/* Footer Page Counter */}
        <text
          x={startX}
          y={84}
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.9"
        >
          {displayRead} / {displayTotal} PAGES READ
        </text>
      </g>
    </svg>
  );
};
