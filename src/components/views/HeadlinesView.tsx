"use client";

import React from "react";
import { Bookmark } from "@/types";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { YouTubeDigestButton } from "@/components/youtube/YouTubeDigestButton";
import { ExternalLink, BookOpen, Archive } from "lucide-react";

interface HeadlinesViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onToggleRead?: (id: number) => void;
  onRecordUse?: (id: number) => void;
  onSelectTag?: (tag: string) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
}

export const HeadlinesView: React.FC<HeadlinesViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onToggleRead,
  onRecordUse,
  onSelectTag,
  onGhostRead,
}) => {
  return (
    <div className="heads">
      {items.map((x) => {
        const isSel = selectedIds.has(x.id);

        const handleLaunchUrl = (evt: React.MouseEvent) => {
          evt.stopPropagation();
          if (evt.metaKey || evt.ctrlKey) {
            onToggleSelect(x.id, evt);
            return;
          }
          window.open(x.url, "_blank", "noopener,noreferrer");
          onRecordUse?.(x.id);
        };

        return (
          <div
            key={x.id}
            tabIndex={0}
            className={`hrow ${isSel ? "sel" : ""}`}
            onClick={(evt) => {
              if (evt.metaKey || evt.ctrlKey) {
                onToggleSelect(x.id, evt);
              } else {
                onOpen(x.id);
              }
            }}
            onKeyDown={(evt) => {
              if (evt.target !== evt.currentTarget) return;
              if (evt.key === "Enter" || evt.key === " ") {
                evt.preventDefault();
                onOpen(x.id);
              }
            }}
          >
            <button
              type="button"
              className="hb"
              data-kind={x.ty}
              aria-pressed={isSel}
              aria-label={isSel ? `Deselect ${x.t}` : `Select ${x.t}`}
              onClick={(evt) => {
                evt.stopPropagation();
                onToggleSelect(x.id, evt);
              }}
              title="Click badge to select"
            >
              {isSel ? "✓" : x.ty}
            </button>

            <span className="ht" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {x.unread && <span className="card-unread-dot" title="Unread" />}
              <a
                href={x.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLaunchUrl}
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {x.t}
              </a>
              {Boolean(extractYouTubeVideoId(x.url)) && (
                <span onClick={(e) => e.stopPropagation()}>
                  <YouTubeDigestButton url={x.url} title={x.t} variant="badge" />
                </span>
              )}
              {x.isQuote && <span className="quote-badge">QUOTE</span>}
            </span>

            <span
              className="hm htag"
              style={{ cursor: onSelectTag ? "pointer" : undefined }}
              onClick={(evt) => {
                if (onSelectTag && x.tag) {
                  evt.stopPropagation();
                  onSelectTag(x.tag);
                }
              }}
            >
              {x.tag ? `#${x.tag}` : ""}
            </span>

            <span className="hm hsrc">{x.src}</span>

            <span className="hm huses" style={{ textAlign: "right" }}>
              {x.useCount ?? 0}× · {x.ty === "ART" && x.mins > 0 ? `${x.mins}m` : x.when}
            </span>

            <span
              className="hm hdur"
              style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}
              onClick={(e) => e.stopPropagation()}
            >
              {onGhostRead && (
                <button
                  type="button"
                  className="hact-btn"
                  onClick={() => onGhostRead(x)}
                  title="Read in Ghost Reader"
                  aria-label="Read in Ghost Reader"
                >
                  <BookOpen size={11} />
                </button>
              )}
              {onToggleRead && (
                <button
                  type="button"
                  className="hact-btn"
                  onClick={() => onToggleRead(x.id)}
                  title="Move to Vault (Mark Read)"
                  aria-label="Move to Vault"
                >
                  <Archive size={11} />
                </button>
              )}
              <button
                type="button"
                className="hact-btn"
                onClick={handleLaunchUrl}
                title="Open URL"
                aria-label="Open URL"
              >
                <ExternalLink size={11} />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
};
