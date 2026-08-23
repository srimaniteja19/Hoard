"use client";

import React from "react";
import { Bookmark } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { Layers, ShieldCheck, AlertTriangle, Zap } from "lucide-react";

import { CoverCanvas } from "@/components/covers/CoverCanvas";
import { calculateSunFadeOpacity } from "@/components/covers/lib/cover-geometry";
import { formatDuration } from "@/lib/format";
import { formatRelativeTime } from "@/lib/library/formatRelativeTime";
import {
  classifyHorizon,
  getBookmarkDate,
  getDaysAgo,
  getHorizonMetadata,
} from "@/lib/library/timeCapsule";

interface BookmarkCardProps {
  bookmark: Bookmark;
  isSelected: boolean;
  heightClass?: "tall" | "short" | "";
  heightPx?: number;
  cardWidthPx?: number;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  isSelected,
  heightClass = "",
  heightPx,
  cardWidthPx,
  onToggleSelect,
  onOpen,
  onOpenDiff,
  onDischarge,
}) => {
  const typeMeta = TYPES[bookmark.ty] || { name: bookmark.ty, c: "#00F0FF", fg: "#000", verb: "READ" };
  const e = bookmark.ex || {};
  const durationText =
    e.Runtime || (e.Stars ? `${e.Stars}★` : e.Pages || (e.Words ? `${e.Words}w` : ""));

  const handleClick = (evt: React.MouseEvent) => {
    if (evt.metaKey || evt.ctrlKey) {
      onToggleSelect(bookmark.id, evt);
    } else {
      onOpen(bookmark.id);
    }
  };

  const is404 = bookmark.driftStatus === "404_preserved";
  const isChanged = bookmark.driftStatus === "changed";
  const sunFadeOpacity = calculateSunFadeOpacity(bookmark.lastFetchedAt || bookmark.when);
  const neverOpened = bookmark.itemType === "REFERENCE" && (bookmark.useCount ?? 0) === 0;

  const bookmarkDate = getBookmarkDate(bookmark);
  const daysAgo = getDaysAgo(bookmarkDate);
  const horizon = bookmark.unread ? classifyHorizon(daysAgo) : null;
  const horizonMeta = horizon ? getHorizonMetadata(horizon, daysAgo) : null;

  return (
    <article
      className={`card ${isSelected ? "sel" : ""}`}
      onClick={handleClick}
      tabIndex={0}
      style={{
        position: "relative",
        ...(sunFadeOpacity < 1 ? { opacity: sunFadeOpacity } : {}),
        ...(cardWidthPx ? { width: `${cardWidthPx}px`, minWidth: `${cardWidthPx}px`, flexShrink: 0 } : {}),
        ...(neverOpened ? { borderLeft: "4px solid var(--orange)" } : {}),
      }}
    >
      {/* Paper Pin Memory Nudge Badge */}
      {horizonMeta && (
        <div
          className={`card-paper-pin card-paper-pin-${horizon}`}
          style={{
            background: horizonMeta.color,
            color: horizonMeta.accent,
          }}
          title={`${horizonMeta.headline}: ${horizonMeta.prompt} — Click to open!`}
          onClick={(evt) => {
            evt.stopPropagation();
            onOpen(bookmark.id);
          }}
        >
          <span className="pin-symbol">📌</span>
          <span className="pin-text">{horizonMeta.badge}</span>
        </div>
      )}
      <div
        className={`cover ${heightClass}`}
        data-kind={bookmark.ty}
        style={heightPx ? { height: `${heightPx}px` } : undefined}
      >
        <CoverCanvas
          kind={bookmark.ty}
          coverData={bookmark.coverData}
          image={bookmark.coverImage}
          ogImageKey={bookmark.ogImageKey}
          ogLqip={bookmark.ogLqip}
          coverSource={bookmark.coverSource}
          ogStatus={bookmark.ogStatus}
          height={heightPx}
        />

        <button
          type="button"
          className="open-affordance"
          onClick={(evt) => {
            evt.stopPropagation();
            onOpen(bookmark.id);
          }}
          title="Open bookmark"
          aria-label="Open bookmark"
        >
          ↗
        </button>

        {/* READ Stamp Overlay */}
        {!bookmark.unread && (
          <div
            className="read-stamp"
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: "currentColor",
              opacity: 0.35,
              transform: "rotate(-6deg)",
              border: "2px solid currentColor",
              padding: "1px 5px",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            [READ]
          </div>
        )}

        <span
          className="chk"
          onClick={(evt) => {
            evt.stopPropagation();
            onToggleSelect(bookmark.id, evt);
          }}
        >
          {isSelected ? "✕" : ""}
        </span>
        <span className="tybadge">{bookmark.ty}</span>
        {bookmark.isQuote && <span className="quote-badge">QUOTE</span>}
        {durationText && <span className="dur">{durationText}</span>}
      </div>

      <div className="cbody">
        {/* Parent Chapter Badge */}
        {bookmark.parentTitle && (
          <div
            style={{
              background: "#FFE600",
              border: "1px solid #000",
              padding: "1px 6px",
              fontSize: "10px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "6px",
              fontFamily: "var(--mono)",
            }}
          >
            <Zap size={10} /> CHAPTER: {bookmark.parentTitle.slice(0, 30)}...
          </div>
        )}

        {/* Cluster Badge */}
        {bookmark.clusterTitle && (
          <div
            style={{
              background: "#7C4DFF",
              color: "#fff",
              border: "1px solid #000",
              padding: "1px 6px",
              fontSize: "10px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "6px",
              fontFamily: "var(--mono)",
            }}
          >
            <Layers size={10} /> CLUSTER: {bookmark.clusterTitle}
          </div>
        )}

        <div className="ct">{bookmark.t}</div>
        <div className="print-url">{bookmark.url}</div>
        {Boolean(bookmark.note && bookmark.note.trim().length > 0 && bookmark.note !== "Saved via HOARD Extension") && (
          <p className={`cex ${bookmark.excerptSource || "user-note"}`}>{bookmark.note}</p>
        )}
        
        <div className="cmeta">
          {e.Platform && <span>{e.Platform} · </span>}
          <span>{bookmark.src}</span>
          {bookmark.ty === "ART" && bookmark.mins > 0 && (
            <>
              <span>·</span>
              <span>READ {formatDuration(bookmark.mins)}</span>
            </>
          )}
          <span>·</span>
          <span>
            {bookmark.useCount ?? 0}× · {formatRelativeTime(bookmark.lastUsedAt)}
          </span>
        </div>

        {/* Drift & Badges Row */}
        <div className="ctags" style={{ flexWrap: "wrap", gap: "4px" }}>
          <span className="ctag" style={{ background: typeMeta.c, color: typeMeta.fg }}>
            #{bookmark.tag}
          </span>

          {bookmark.unread && (
            <span className="ctag" style={{ background: "#FF007A", color: "#fff" }}>
              UNREAD
            </span>
          )}

          {bookmark.unread && onDischarge && (
            <span
              className="ctag discharge-btn"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                const cardEl = (e.currentTarget as HTMLElement).closest("article");
                const rect = cardEl?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
                onDischarge(bookmark, rect);
              }}
              style={{
                background: "var(--lime, #B6FF3C)",
                color: "#000",
                cursor: "pointer",
                fontWeight: 800,
              }}
              title="Turn this into a TIL entry"
            >
              DISCHARGE ↦
            </span>
          )}

          {isChanged && (
            <span
              className="ctag"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDiff) onOpenDiff(bookmark);
              }}
              style={{ background: "#FFE600", color: "#000", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
              title="Click to view rendered text diff"
            >
              <AlertTriangle size={10} /> DRIFT &gt;{bookmark.driftPercent || 15}%
            </span>
          )}

          {is404 && (
            <span
              className="ctag"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDiff) onOpenDiff(bookmark);
              }}
              style={{ background: "#FF007A", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
              title="Click to view preserved copy"
            >
              <ShieldCheck size={10} /> 404 PRESERVED
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
