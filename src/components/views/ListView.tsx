"use client";

import React from "react";
import { Bookmark } from "@/types";
import { formatRelativeTime } from "@/lib/library/formatRelativeTime";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { YouTubeDigestButton } from "@/components/youtube/YouTubeDigestButton";
import { BookOpen, ExternalLink, Zap, Sparkles, SlidersHorizontal } from "lucide-react";

interface ListViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onRecordUse?: (id: number) => void;
  onSelectTag?: (tag: string) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
  onOpenSynapse?: (bookmark: Bookmark) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onRecordUse,
  onSelectTag,
  onGhostRead,
  onDischarge,
  onOpenSynapse,
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
        const hasValidNote = Boolean(
          x.note && x.note.trim().length > 0 && x.note !== "Saved via HOARD Extension"
        );

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
            <div
              className="swatch"
              data-kind={x.ty}
              onClick={(evt) => {
                evt.stopPropagation();
                onToggleSelect(x.id, evt);
              }}
              title="Click swatch to select row"
            >
              {isSel ? "✓" : x.ty}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="rt">
                {x.unread && (
                  <span
                    className="card-unread-dot"
                    title="Unread"
                    style={{ marginRight: "2px" }}
                  />
                )}
                <a
                  href={x.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rt-link"
                  onClick={handleLaunchUrl}
                >
                  {x.t}
                </a>
                {x.isQuote && <span className="quote-badge">QUOTE</span>}
              </div>

              {hasValidNote && (
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.72,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "2px",
                  }}
                >
                  {x.note}
                </div>
              )}

              <div className="rm">
                {metaBits.map((b, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                    <span>{b}</span>
                  </React.Fragment>
                ))}
                {x.tag && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span
                      style={{ cursor: onSelectTag ? "pointer" : undefined, textDecoration: onSelectTag ? "underline" : undefined }}
                      onClick={(evt) => {
                        if (onSelectTag) {
                          evt.stopPropagation();
                          onSelectTag(x.tag);
                        }
                      }}
                    >
                      #{x.tag}
                    </span>
                  </>
                )}
                {Boolean(extractYouTubeVideoId(x.url)) && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <YouTubeDigestButton url={x.url} title={x.t} variant="link" />
                    </span>
                  </>
                )}
                {x.ty === "ART" && x.mins > 0 && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{x.mins}m read</span>
                  </>
                )}
                <span style={{ opacity: 0.4 }}>·</span>
                <span>
                  {x.useCount ?? 0}× · {formatRelativeTime(x.lastUsedAt)}
                </span>
              </div>
            </div>

            <div className="list-row-actions" onClick={(evt) => evt.stopPropagation()}>
              {onGhostRead && (
                <button
                  type="button"
                  className="card-dock-btn"
                  style={{ border: "1.5px solid var(--ink)", background: "var(--paper)" }}
                  onClick={() => onGhostRead(x)}
                  title="Read in Ghost Reader"
                >
                  <BookOpen size={11} /> READ
                </button>
              )}
              {x.unread && onDischarge && (
                <button
                  type="button"
                  className="card-dock-btn"
                  style={{ border: "1.5px solid var(--ink)", background: "var(--paper)" }}
                  onClick={(evt) => {
                    const rowEl = (evt.currentTarget as HTMLElement).closest(".row");
                    const rect =
                      rowEl?.getBoundingClientRect() ??
                      evt.currentTarget.getBoundingClientRect();
                    onDischarge(x, rect);
                  }}
                  title="Discharge to TIL"
                >
                  <Zap size={11} /> TIL
                </button>
              )}
              {onOpenSynapse && (
                <button
                  type="button"
                  className="card-dock-btn"
                  style={{ border: "1.5px solid var(--ink)", background: "var(--paper)" }}
                  onClick={() => onOpenSynapse(x)}
                  title="Synapse Trail"
                >
                  <Sparkles size={11} />
                </button>
              )}
              <button
                type="button"
                className="card-dock-btn"
                style={{ border: "1.5px solid var(--ink)", background: "var(--paper)" }}
                onClick={() => onOpen(x.id)}
                title="Inspect Details"
              >
                <SlidersHorizontal size={11} />
              </button>
              <button
                type="button"
                className="card-dock-btn"
                style={{ border: "1.5px solid var(--ink)", background: "var(--paper)" }}
                onClick={handleLaunchUrl}
                title="Open URL"
              >
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
