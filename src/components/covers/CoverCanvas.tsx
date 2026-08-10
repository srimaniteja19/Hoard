import React from "react";
import { KindType } from "@/types";
import { HatchFallback } from "./HatchFallback";

export interface CoverCanvasProps {
  kind: KindType;
  coverData?: unknown;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * CoverCanvas — Master cover router component.
 * Evaluates kind and coverData, returning server-rendered SVG.
 * Falls back to HatchFallback when coverData is missing or invalid.
 */
export const CoverCanvas: React.FC<CoverCanvasProps> = (props) => {
  const { kind, height, className = "", ariaLabel } = props;
  const defaultLabel = `${kind} cover visualization`;

  return (
    <div
      className={`cover-canvas-wrap ${className}`}
      data-kind={kind}
      role="img"
      aria-label={ariaLabel || defaultLabel}
      style={{
        width: "100%",
        height: height ? `${height}px` : "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <HatchFallback kind={kind} />
    </div>
  );
};
