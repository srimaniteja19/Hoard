import React from "react";

export interface ArticleCoverData {
  paragraphWidths: number[];
  scrollFraction: number;
}

interface ArticleCoverProps {
  data: ArticleCoverData;
}

/**
 * ArticleCover — Kind-specific SVG cover for ARTICLE bookmarks.
 * Renders 9–12 horizontal rules forming a text-density thumbnail with scroll progress.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const ArticleCover: React.FC<ArticleCoverProps> = ({ data }) => {
  const { paragraphWidths, scrollFraction } = data;
  const lines = paragraphWidths.slice(0, 12);
  const startX = 24;
  const maxWidth = 240;
  const startY = 16;
  const stepY = 6.2;
  const lineHeight = 3;

  const pctRead = Math.round(scrollFraction * 100);
  const ariaLabel = `Article text density thumbnail with ${lines.length} paragraphs, ${pctRead}% read.`;

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
      {/* Text Density Thumbnail Paragraph Lines */}
      <g>
        {lines.map((widthPct, idx) => {
          const w = Math.max(20, Math.round((widthPct / 100) * maxWidth));
          const y = startY + idx * stepY;

          return (
            <rect
              key={idx}
              x={startX}
              y={y}
              width={w}
              height={lineHeight}
              rx={1.5}
              fill="currentColor"
              fillOpacity={0.75}
            />
          );
        })}
      </g>

      {/* Scroll Progress Bar along bottom edge */}
      <g transform="translate(0, 98)">
        {/* Track */}
        <rect
          x={0}
          y={0}
          width={288}
          height={6}
          fill="currentColor"
          fillOpacity={0.15}
        />
        {/* Filled Progress */}
        {scrollFraction > 0 && (
          <rect
            x={0}
            y={0}
            width={Math.round(288 * Math.min(1, Math.max(0, scrollFraction)))}
            height={6}
            fill="currentColor"
            fillOpacity={0.95}
          />
        )}
      </g>
    </svg>
  );
};
