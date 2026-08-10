import React from "react";

export interface DocCoverData {
  siblings: string[];
  activeIndex: number;
}

interface DocCoverProps {
  data: DocCoverData;
}

/**
 * DocCover — Kind-specific SVG cover for DOC bookmarks.
 * Renders sibling section list with saved section emphasized and rest at 50% opacity.
 * Pure server-rendered SVG using `currentColor` for zero hex hardcoding.
 */
export const DocCover: React.FC<DocCoverProps> = ({ data }) => {
  const { siblings = ["Overview", "API Reference"], activeIndex = 0 } = data;
  const list = (siblings.length > 0 ? siblings : ["Section 1", "Section 2", "Section 3"]).slice(0, 4);
  const safeActiveIdx = Math.min(list.length - 1, Math.max(0, activeIndex));

  const startX = 20;
  const startY = 22;
  const stepY = 19;

  const activeTitle = list[safeActiveIdx] || "Documentation";
  const ariaLabel = `Documentation navigation: ${activeTitle} selected.`;

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
        {list.map((title, idx) => {
          const isActive = idx === safeActiveIdx;
          const y = startY + idx * stepY;

          return (
            <g key={idx} opacity={isActive ? 1 : 0.45}>
              {/* Bullet indicator */}
              <circle
                cx={startX}
                cy={y - 3}
                r={isActive ? 3.5 : 2.5}
                fill="currentColor"
              />
              {/* Section title */}
              <text
                x={startX + 12}
                y={y}
                fontFamily="var(--mono)"
                fontSize={isActive ? "11" : "10"}
                fontWeight={isActive ? "900" : "600"}
                fill="currentColor"
              >
                {title.length > 30 ? `${title.slice(0, 28)}...` : title}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
