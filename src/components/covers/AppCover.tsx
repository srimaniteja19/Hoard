import React from "react";

export interface AppCoverData {
  platforms: string[];
  pricing?: string;
  installed: boolean;
}

interface AppCoverProps {
  data: AppCoverData;
}

/**
 * AppCover — Kind-specific SVG cover for APP bookmarks.
 * Renders platform badges, pricing, and INSTALLED? YES/NOT YET status line.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const AppCover: React.FC<AppCoverProps> = ({ data }) => {
  const { platforms = ["Web"], pricing = "Free", installed = false } = data;
  const startX = 18;

  const platformStr = platforms.join(" · ") || "Web / Mobile";
  const ariaLabel = `App specification: ${platformStr}, ${pricing}, ${installed ? "installed" : "not installed"}.`;

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
        {/* Header Platform List & Pricing */}
        <text
          x={startX}
          y={26}
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="800"
          fill="currentColor"
          fillOpacity="0.8"
        >
          {platformStr.toUpperCase()}
        </text>

        <text
          x={270}
          y={26}
          textAnchor="end"
          fontFamily="var(--mono)"
          fontSize="10"
          fontWeight="900"
          fill="currentColor"
          fillOpacity="0.9"
        >
          [{pricing.toUpperCase()}]
        </text>

        {/* Status Line: INSTALLED? YES / NOT YET */}
        <g transform="translate(18, 58)">
          <rect
            x={0}
            y={0}
            width={252}
            height={26}
            rx={3}
            fill="currentColor"
            fillOpacity={0.12}
            stroke="currentColor"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <text
            x={12}
            y={17}
            fontFamily="var(--mono)"
            fontSize="10"
            fontWeight="900"
            fill="currentColor"
          >
            INSTALLED? {installed ? "YES ✓" : "NOT YET"}
          </text>
        </g>
      </g>
    </svg>
  );
};
