"use client";

import React from "react";
import { Bookmark } from "@/types";
import { formatRelativeTime } from "@/lib/library/formatRelativeTime";
import {
  classifyHorizon,
  getBookmarkDate,
  getDaysAgo,
  getHorizonMetadata,
} from "@/lib/library/timeCapsule";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { YouTubeDigestButton } from "@/components/youtube/YouTubeDigestButton";

interface ListViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
}) => {
  const getMetaBits = (x: Bookmark) => {
    const bits: string[] = [x.src];
    Object.entries(x.ex)
      .filter(([k, v]) => k !== "coverData" && typeof v === "string")
      .slice(0, 2)
      .forEach(([k, v]) => {
        bits.push(x.ty === "GIT" && k === "Stars" ? `${v}★` : v);
      });
    return bits;
  };

  return (
    <div className="list">
      {items.map((x) => {
        const isSel = selectedIds.has(x.id);
        const metaBits = getMetaBits(x);
        const neverOpened = x.itemType === "REFERENCE" && (x.useCount ?? 0) === 0;

        const bookmarkDate = getBookmarkDate(x);
        const daysAgo = getDaysAgo(bookmarkDate);
        const horizon = x.unread ? classifyHorizon(daysAgo) : null;
        const horizonMeta = horizon ? getHorizonMetadata(horizon, daysAgo) : null;

        return (
          <div
            key={x.id}
            className={`row ${isSel ? "sel" : ""}`}
            onClick={(evt) => {
              if (evt.metaKey || evt.ctrlKey) {
                onToggleSelect(x.id, evt);
              } else {
                onOpen(x.id);
              }
            }}
            style={neverOpened ? { borderLeft: "3px solid var(--orange)" } : undefined}
          >
            <div className="swatch" data-kind={x.ty}>
              {x.ty}
            </div>

            <div>
              <div className="rt">
                {x.t}
                {horizonMeta && (
                  <span
                    className={`list-paper-pin list-paper-pin-${horizon}`}
                    style={{
                      background: horizonMeta.color,
                      color: horizonMeta.accent,
                    }}
                    title={`${horizonMeta.headline}: ${horizonMeta.prompt}`}
                  >
                    📌 {horizonMeta.badge}
                  </span>
                )}
                {x.isQuote && <span className="quote-badge">QUOTE</span>}
                {x.unread && <span style={{ color: "#FF007A", marginLeft: 6 }}>●</span>}
              </div>
              <div className="rm">
                {metaBits.map((b, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                    <span>{b}</span>
                  </React.Fragment>
                ))}
                <span style={{ opacity: 0.4 }}>·</span>
                <span>#{x.tag}</span>
                {Boolean(extractYouTubeVideoId(x.url)) && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <YouTubeDigestButton url={x.url} title={x.t} variant="link" />
                  </>
                )}
                {x.ty === "ART" && x.mins > 0 && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>READ {x.mins}m</span>
                  </>
                )}
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{x.when}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>
                  {x.useCount ?? 0}× · {formatRelativeTime(x.lastUsedAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
