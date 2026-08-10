import React from "react";

export interface VideoCoverData {
  chapterOffsets: number[]; // 0-1 fractions of runtime
  watchedFraction: number; // 0-1 fraction watched
  nextChapterTitle?: string;
}

interface VideoCoverProps {
  data: VideoCoverData;
}

/**
 * VideoCover — Kind-specific SVG cover for VIDEO bookmarks.
 * Renders full-width duration bar filled to watchedFraction with chapter ticks,
 * header info, and next unwatched chapter line.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const VideoCover: React.FC<VideoCoverProps> = ({ data }) => {
  const { chapterOffsets = [], watchedFraction = 0, nextChapterTitle } = data;
  const startX = 14;
  const widthTotal = 260;
  const barY = 40;
  const barHeight = 10;

  const pctWatched = Math.round(Math.min(1, Math.max(0, watchedFraction)) * 100);
  const chapterCount = Math.max(1, chapterOffsets.length);

  // Compute next unwatched chapter index
  const nextIdx = chapterOffsets.findIndex((offset) => offset > watchedFraction);
  const displayNextChapter =
    nextChapterTitle ||
    (nextIdx >= 0 ? `Ch ${nextIdx + 1}` : pctWatched >= 100 ? "Completed" : "Chapter 1");

  const ariaLabel = `Video progress: ${pctWatched}% watched across ${chapterCount} chapters. Next: ${displayNextChapter}.`;

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
        {/* Header Stats */}
        <text
          x={startX}
          y={24}
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.8"
        >
          {chapterCount} {chapterCount === 1 ? "CHAPTER" : "CHAPTERS"}
        </text>

        <text
          x={startX + widthTotal}
          y={24}
          textAnchor="end"
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.9"
        >
          {pctWatched}% WATCHED
        </text>

        {/* Full-width Duration Bar Track */}
        <rect
          x={startX}
          y={barY}
          width={widthTotal}
          height={barHeight}
          rx={3}
          fill="currentColor"
          fillOpacity={0.15}
        />

        {/* Watched Progress Fill */}
        {watchedFraction > 0 && (
          <rect
            x={startX}
            y={barY}
            width={Math.round(widthTotal * Math.min(1, watchedFraction))}
            height={barHeight}
            rx={3}
            fill="currentColor"
            fillOpacity={0.85}
          />
        )}

        {/* Chapter Tick Marks */}
        {chapterOffsets.map((offset, idx) => {
          if (offset <= 0 || offset >= 1) return null;
          const tickX = startX + widthTotal * offset;
          return (
            <line
              key={idx}
              x1={tickX}
              y1={barY - 2}
              x2={tickX}
              y2={barY + barHeight + 2}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
          );
        })}

        {/* Footer: Next Unwatched Chapter Line */}
        <text
          x={startX}
          y={82}
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.9"
        >
          NEXT: {displayNextChapter.length > 32 ? `${displayNextChapter.slice(0, 30)}...` : displayNextChapter}
        </text>
      </g>
    </svg>
  );
};
