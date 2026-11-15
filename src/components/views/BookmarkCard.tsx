"use client";

import React from "react";
import { Bookmark } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Sparkles,
  BookOpen,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

import { CoverCanvas } from "@/components/covers/CoverCanvas";
import { calculateSunFadeOpacity } from "@/components/covers/lib/cover-geometry";
import { formatDuration } from "@/lib/format";
import { formatRelativeTime } from "@/lib/library/formatRelativeTime";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { YouTubeDigestButton } from "@/components/youtube/YouTubeDigestButton";

interface BookmarkCardProps {
  bookmark: Bookmark;
  isSelected: boolean;
  heightClass?: "tall" | "short" | "";
  heightPx?: number;
  cardWidthPx?: number;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onRecordUse?: (id: number) => void;
  onSelectTag?: (tag: string) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
  onOpenSynapse?: (bookmark: Bookmark) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  isSelected,
  heightClass = "",
  heightPx,
  cardWidthPx,
  onToggleSelect,
  onOpen,
  onRecordUse,
  onSelectTag,
  onOpenDiff,
  onDischarge,
  onGhostRead,
  onOpenSynapse,
}) => {
  const typeMeta = TYPES[bookmark.ty] || {
    name: bookmark.ty,
    c: "#00F0FF",
    fg: "#000",
    verb: "READ",
  };
  const e = bookmark.ex || {};
  const durationText =
    e.Runtime || (e.Stars ? `${e.Stars}★` : e.Pages || (e.Words ? `${e.Words}w` : ""));

  // Clicking the card body or Inspector icon opens the Inspector Drawer
  const handleCardClick = (evt: React.MouseEvent) => {
    if (evt.metaKey || evt.ctrlKey) {
      onToggleSelect(bookmark.id, evt);
    } else {
      onOpen(bookmark.id);
    }
  };

  // Clicking the Title or Open button launches the URL directly and records usage
  const handleLaunchUrl = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (evt.metaKey || evt.ctrlKey) {
      onToggleSelect(bookmark.id, evt);
      return;
    }
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
    onRecordUse?.(bookmark.id);
  };

  const is404 = bookmark.driftStatus === "404_preserved";
  const isChanged = bookmark.driftStatus === "changed";
  const sunFadeOpacity = calculateSunFadeOpacity(bookmark.lastFetchedAt || bookmark.when);
  const neverOpened = bookmark.itemType === "REFERENCE" && (bookmark.useCount ?? 0) === 0;

  const hasValidNote = Boolean(
    bookmark.note &&
      bookmark.note.trim().length > 0 &&
      bookmark.note !== "Saved via HOARD Extension"
  );

  return (
    <article
      className={`card ${isSelected ? "sel" : ""}`}
      onClick={handleCardClick}
      tabIndex={0}
      style={{
        position: "relative",
        ...(sunFadeOpacity < 1 ? { opacity: sunFadeOpacity } : {}),
        ...(cardWidthPx
          ? { width: `${cardWidthPx}px`, minWidth: `${cardWidthPx}px`, flexShrink: 0 }
          : {}),
        ...(neverOpened ? { borderLeft: "3px solid var(--orange)" } : {}),
      }}
    >
      {/* Slimmer, Cleaner Cover Header */}
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

        {/* Top-left Multi-select Checkbox */}
        <span
          className="chk"
          onClick={(evt) => {
            evt.stopPropagation();
            onToggleSelect(bookmark.id, evt);
          }}
          title="Select bookmark (⌘+Click)"
        >
          {isSelected ? "✓" : ""}
        </span>

        {/* Unified Top-right Hover Action Dock */}
        <div className="card-hover-dock" onClick={(evt) => evt.stopPropagation()}>
          {onGhostRead && (
            <button
              type="button"
              className="card-dock-btn"
              onClick={(evt) => {
                evt.stopPropagation();
                onGhostRead(bookmark);
              }}
              title="Read in distraction-free Ghost Reader"
            >
              <BookOpen size={11} /> READ
            </button>
          )}

          {bookmark.unread && onDischarge && (
            <button
              type="button"
              className="card-dock-btn"
              onClick={(evt) => {
                evt.stopPropagation();
                const cardEl = (evt.currentTarget as HTMLElement).closest("article");
                const rect =
                  cardEl?.getBoundingClientRect() ??
                  evt.currentTarget.getBoundingClientRect();
                onDischarge(bookmark, rect);
              }}
              title="Discharge into a TIL entry"
            >
              <Zap size={11} /> TIL
            </button>
          )}

          {onOpenSynapse && (
            <button
              type="button"
              className="card-dock-btn"
              onClick={(evt) => {
                evt.stopPropagation();
                onOpenSynapse(bookmark);
              }}
              title="Explore Synapse Trail (Semantic Connections)"
            >
              <Sparkles size={11} />
            </button>
          )}

          <button
            type="button"
            className="card-dock-btn"
            onClick={(evt) => {
              evt.stopPropagation();
              onOpen(bookmark.id);
            }}
            title="Inspect & Edit Details"
          >
            <SlidersHorizontal size={11} />
          </button>

          <button
            type="button"
            className="card-dock-btn"
            onClick={handleLaunchUrl}
            title="Open original URL in new tab"
          >
            <ExternalLink size={11} />
          </button>
        </div>

        {/* Bottom-left Kind Pill */}
        <span className="tybadge">{typeMeta.name.toUpperCase()}</span>
        {bookmark.isQuote && <span className="quote-badge">QUOTE</span>}

        {/* Bottom-right Duration or YouTube Digest */}
        {Boolean(extractYouTubeVideoId(bookmark.url)) ? (
          <div
            onClick={(evt) => evt.stopPropagation()}
            style={{ position: "absolute", right: "8px", bottom: "8px", zIndex: 4 }}
          >
            <YouTubeDigestButton url={bookmark.url} title={bookmark.t} variant="badge" />
          </div>
        ) : (
          durationText && <span className="dur">{durationText}</span>
        )}
      </div>

      {/* Editorial Card Body */}
      <div className="cbody">
        {/* Eyebrow: Source Domain + Reading Time */}
        <div className="card-eyebrow">
          <span className="card-domain">
            {bookmark.unread && <span className="card-unread-dot" title="Unread" />}
            <span>{bookmark.src}</span>
            {e.Platform && <span>· {e.Platform}</span>}
          </span>
          {bookmark.ty === "ART" && bookmark.mins > 0 && (
            <span>{formatDuration(bookmark.mins)}</span>
          )}
        </div>

        {/* Optional Parent Chapter or Topic Cluster Context */}
        {(bookmark.parentTitle || bookmark.clusterTitle) && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {bookmark.parentTitle && (
              <span
                style={{
                  fontSize: "9.5px",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  background: "color-mix(in oklab, var(--yel) 35%, var(--paper))",
                  border: "1px solid var(--ink)",
                  padding: "0 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Zap size={9} /> {bookmark.parentTitle.slice(0, 26)}
              </span>
            )}
            {bookmark.clusterTitle && (
              <span
                style={{
                  fontSize: "9.5px",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  background: "var(--cream)",
                  border: "1px solid color-mix(in oklab, var(--ink) 35%, transparent)",
                  padding: "0 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Layers size={9} /> {bookmark.clusterTitle}
              </span>
            )}
          </div>
        )}

        {/* Primary Title — Clicking opens URL directly & logs use */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-title-link"
          onClick={handleLaunchUrl}
          title={`Open ${bookmark.url}`}
        >
          {bookmark.t}
        </a>

        <div className="print-url">{bookmark.url}</div>

        {/* Quiet Excerpt or Highlighted User Note */}
        {hasValidNote && (
          <p className={`cex ${bookmark.excerptSource || "user-note"}`}>{bookmark.note}</p>
        )}

        {/* Quiet Footer: Tag Pill + Drift Alerts + Usage Count */}
        <div className="card-footer">
          <div className="card-footer-left">
            {bookmark.tag && (
              <span
                className="card-tag-pill"
                onClick={(evt) => {
                  if (onSelectTag) {
                    evt.stopPropagation();
                    onSelectTag(bookmark.tag);
                  }
                }}
                title={onSelectTag ? `Filter by #${bookmark.tag}` : undefined}
              >
                #{bookmark.tag}
              </span>
            )}

            {isChanged && (
              <span
                className="card-status-badge"
                onClick={(evt) => {
                  evt.stopPropagation();
                  if (onOpenDiff) onOpenDiff(bookmark);
                }}
                style={{ background: "var(--yel)", color: "#000", cursor: "pointer" }}
                title="Content changed — click to view diff"
              >
                <AlertTriangle size={9} /> DRIFT
              </span>
            )}

            {is404 && (
              <span
                className="card-status-badge"
                onClick={(evt) => {
                  evt.stopPropagation();
                  if (onOpenDiff) onOpenDiff(bookmark);
                }}
                style={{ background: "var(--pink)", color: "#fff", cursor: "pointer" }}
                title="404 Preserved — click to view snapshot"
              >
                <ShieldCheck size={9} /> 404 SAVED
              </span>
            )}
          </div>

          <div className="card-footer-right">
            <span>
              {bookmark.useCount ?? 0}× · {formatRelativeTime(bookmark.lastUsedAt)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
