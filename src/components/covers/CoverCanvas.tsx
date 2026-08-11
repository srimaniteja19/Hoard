import React, { useState } from "react";
import { KindType } from "@/types";
import { parseCoverData } from "@/lib/cover-data";
import { getBlobUrl } from "@/lib/storage/blobUrl";
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
  image?: string | null;
  ogImageKey?: string | null;
  ogLqip?: string | null;
  coverSource?: string | null;
  ogStatus?: string | null;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * CoverCanvas — Master cover router component (§5.1).
 * When coverSource === 'og' and ogStatus === 'READY', renders mirrored WebP image
 * with duotone filter matching bookmark.kind and LQIP placeholder while loading.
 * Otherwise renders kind-specific SVG data-ink cover.
 */
export const CoverCanvas: React.FC<CoverCanvasProps> = (props) => {
  const {
    kind,
    coverData,
    image,
    ogImageKey,
    ogLqip,
    height,
    className = "",
    ariaLabel,
  } = props;
  const parsed = parseCoverData(coverData);
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedImgUrl = (ogImageKey ? getBlobUrl(ogImageKey) : null) || image;
  const filterStyle = resolvedImgUrl ? `url(#duotone-${kind})` : "none";

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
  const showImage = !!resolvedImgUrl && !imageFailed;

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
        ...(ogLqip && showImage ? { backgroundImage: `url(${ogLqip})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedImgUrl || ""}
          alt=""
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            filter: filterStyle,
          }}
        />
      ) : (
        <>
          {renderInnerCover()}

          {/* Risograph halftone texture pattern overlay */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <defs>
              <pattern
                id="risograph-halftone"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="3" cy="3" r="0.85" fill="currentColor" fillOpacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#risograph-halftone)" />
          </svg>
        </>
      )}
    </div>
  );
};
