import React from "react";

export interface PlaylistCoverData {
  trackCount: number;
  trackLengths: number[]; // sampled up to 44, normalised 0-100
}

interface PlaylistCoverProps {
  data: PlaylistCoverData;
}

/**
 * PlaylistCover — Kind-specific SVG cover for PLAYLIST bookmarks.
 * Renders vertical track bars (sampled up to 44 max) and track count in footer.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const PlaylistCover: React.FC<PlaylistCoverProps> = ({ data }) => {
  const { trackCount = 0, trackLengths = [] } = data;
  const bars = (trackLengths.length > 0 ? trackLengths : Array(24).fill(40)).slice(0, 44);
  const startX = 14;
  const maxBarHeight = 40;
  const baselineY = 60;
  const barWidth = 4;
  const gap = 1.8;

  const count = Math.max(trackCount, bars.length);
  const ariaLabel = `Playlist visualization with ${count} tracks.`;

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
        {/* Track Length Vertical Bars */}
        {bars.map((val, idx) => {
          const h = Math.max(4, Math.round((val / 100) * maxBarHeight));
          const x = startX + idx * (barWidth + gap);
          const y = baselineY - h;

          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={1.5}
              fill="currentColor"
              fillOpacity={0.75}
            />
          );
        })}

        {/* Footer info */}
        <text
          x={startX}
          y={84}
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.9"
        >
          {count} TRACKS · PLAYLIST
        </text>
      </g>
    </svg>
  );
};
