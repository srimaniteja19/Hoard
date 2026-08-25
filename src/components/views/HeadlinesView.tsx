"use client";

import React from "react";
import { Bookmark } from "@/types";
import {
  classifyHorizon,
  getBookmarkDate,
  getDaysAgo,
  getHorizonMetadata,
} from "@/lib/library/timeCapsule";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { YouTubeDigestButton } from "@/components/youtube/YouTubeDigestButton";

interface HeadlinesViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
}

export const HeadlinesView: React.FC<HeadlinesViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
}) => {
  return (
    <div className="heads">
      {items.map((x) => {
        const isSel = selectedIds.has(x.id);
        const neverOpened = x.itemType === "REFERENCE" && (x.useCount ?? 0) === 0;

        const bookmarkDate = getBookmarkDate(x);
        const daysAgo = getDaysAgo(bookmarkDate);
        const horizon = x.unread ? classifyHorizon(daysAgo) : null;
        const horizonMeta = horizon ? getHorizonMetadata(horizon, daysAgo) : null;

        return (
          <div
            key={x.id}
            className={`hrow ${isSel ? "sel" : ""}`}
            onClick={(evt) => {
              if (evt.metaKey || evt.ctrlKey) {
                onToggleSelect(x.id, evt);
              } else {
                onOpen(x.id);
              }
            }}
            style={neverOpened ? { borderLeft: "3px solid var(--orange)" } : undefined}
          >
            <span className="hb" data-kind={x.ty}>
              {x.ty}
            </span>
            <span className="ht">
              {x.t}
              {horizonMeta && (
                <span
                  className={`heads-paper-pin heads-paper-pin-${horizon}`}
                  style={{
                    background: horizonMeta.color,
                    color: horizonMeta.accent,
                  }}
                  title={`${horizonMeta.headline}: ${horizonMeta.prompt}`}
                >
                  📌 {horizonMeta.badge}
                </span>
              )}
            </span>
            {Boolean(extractYouTubeVideoId(x.url)) && (
              <YouTubeDigestButton url={x.url} title={x.t} variant="badge" style={{ marginLeft: 6 }} />
            )}
            {x.isQuote && <span className="quote-badge">QUOTE</span>}
            <span className="hm hsrc">{x.src}</span>
            <span className="hm huses" style={{ textAlign: "right" }}>
              {x.useCount ?? 0}×
            </span>
            <span className="hm hdur" style={{ textAlign: "right" }}>
              {x.ty === "ART" && x.mins > 0 ? `${x.mins}m` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
};
