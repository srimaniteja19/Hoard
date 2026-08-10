import React from "react";

interface HatchFallbackProps {
  kind: string;
}

/**
 * Server-rendered SVG fallback cover using pure diagonal hatched pattern.
 * Uses `currentColor` for strokes and fills — zero hardcoded hex literals.
 */
export const HatchFallback: React.FC<HatchFallbackProps> = () => {
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
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="hatch-pattern"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="12"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.22"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hatch-pattern)" />
    </svg>
  );
};
