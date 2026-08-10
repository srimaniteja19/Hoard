import React from "react";
import { KindType } from "@/types";
import { parseCoverData } from "@/lib/cover-data";
import { HatchFallback } from "./HatchFallback";
import { RepoCover } from "./RepoCover";
import { ArticleCover } from "./ArticleCover";
import { VideoCover } from "./VideoCover";
import { PaperCover } from "./PaperCover";
import { PlaylistCover } from "./PlaylistCover";
import { DocCover } from "./DocCover";
import { AppCover } from "./AppCover";

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
  const { kind, coverData, height, className = "", ariaLabel } = props;
  const parsed = parseCoverData(coverData);

  const renderInnerCover = () => {
    if (parsed) {
      if (parsed.kind === "REPO" && (kind === "GIT" || parsed.kind === "REPO")) {
        return <RepoCover data={parsed} />;
      }
      if (parsed.kind === "ARTICLE" && (kind === "ART" || parsed.kind === "ARTICLE")) {
        return <ArticleCover data={parsed} />;
      }
      if (parsed.kind === "VIDEO" && (kind === "VID" || parsed.kind === "VIDEO")) {
        return <VideoCover data={parsed} />;
      }
      if (parsed.kind === "PAPER" && (kind === "PPR" || parsed.kind === "PAPER")) {
        return <PaperCover data={parsed} />;
      }
      if (parsed.kind === "PLAYLIST" && (kind === "PLY" || parsed.kind === "PLAYLIST")) {
        return <PlaylistCover data={parsed} />;
      }
      if (parsed.kind === "DOC" && (kind === "DOC" || parsed.kind === "DOC")) {
        return <DocCover data={parsed} />;
      }
      if (parsed.kind === "APP" && (kind === "APP" || parsed.kind === "APP")) {
        return <AppCover data={parsed} />;
      }
    }
    return <HatchFallback kind={kind} />;
  };

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
      {renderInnerCover()}
    </div>
  );
};
