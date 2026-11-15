"use client";

import React from "react";
import { Bookmark } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import {
  ShieldCheck,
  AlertTriangle,
  Zap,
  BookOpen,
  Archive,
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
  onToggleRead?: (id: number) => void;
  onRecordUse?: (id: number) => void;
  onSelectTag?: (tag: string) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  isSelected,
  heightClass = "",
  heightPx,
  cardWidthPx,
  onToggleSelect,
  onOpen,
  onToggleRead,
  onRecordUse,
  onSelectTag,
  onOpenDiff,
  onDischarge,
  onGhostRead,
}) => {
  const typeMeta = TYPES[bookmark.ty] || {
    name: bookmark.ty,
    c: "var(--cyan)",
    fg: "#000",
    verb: "READ",
  };
  const e = bookmark.ex || {};
  const durationText =
    e.Runtime || (e.Stars ? `${e.Stars}★` : e.Pages || (e.Words ? `${e.Words}w` : ""));

  // Clicking the card body opens the Inspector Drawer
  const handleCardClick = (evt: React.MouseEvent) => {
    if (evt.metaKey || evt.ctrlKey) {
      onToggleSelect(bookmark.id, evt);
    } else {
      onOpen(bookmark.id);
    }
  };

  const handleCardKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.target !== evt.currentTarget) return;
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      onOpen(bookmark.id);
    }
  };

  // Clicking the Title launches the URL directly and records usage
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

  const hasValidNote = Boolean(
    bookmark.note &&
      bookmark.note.trim().length > 0 &&
      bookmark.note !== "Saved via HOARD Extension"
  );

  return (
    <article
      className={`card ${isSelected ? "sel" : ""}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      aria-label={`${bookmark.t} (${bookmark.src})`}
      style={{
        position: "relative",
        ...(sunFadeOpacity < 1 ? { opacity: sunFadeOpacity } : {}),
        ...(cardWidthPx
          ? { width: `${cardWidthPx}px`, minWidth: `${cardWidthPx}px`, flexShrink: 0 }
          : {}),
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
        <button
          type="button"
          className="chk"
          aria-pressed={isSelected}
          aria-label={isSelected ? `Deselect ${bookmark.t}` : `Select ${bookmark.t}`}
          onClick={(evt) => {
            evt.stopPropagation();
            onToggleSelect(bookmark.id, evt);
          }}
          title="Select bookmark (⌘+Click)"
        >
          {isSelected ? "✓" : ""}
        </button>

        {/* Focused 3-Action Hover Dock (READ, TIL, VAULT) */}
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
              title="Log a TIL note from this bookmark"
            >
              <Zap size={11} /> TIL
            </button>
          )}

          {onToggleRead && (
            <button
              type="button"
              className="card-dock-btn"
              onClick={(evt) => {
                evt.stopPropagation();
                onToggleRead(bookmark.id);
              }}
              title={bookmark.unread ? "Move to Vault (Mark Read)" : "Restore from Vault"}
            >
              <Archive size={11} /> VAULT
            </button>
          )}
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

      {/* Editorial Card Body — Title first, Source subline below */}
      <div className="cbody">
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

        {/* Source Domain + Reading Time Subline */}
        <div className="card-subline">
          <span className="card-domain">
            {bookmark.unread && <span className="card-unread-dot" title="Unread" />}
            <span>{bookmark.src}</span>
            {e.Platform && <span>· {e.Platform}</span>}
          </span>
          {bookmark.ty === "ART" && bookmark.mins > 0 && (
            <span>{formatDuration(bookmark.mins)}</span>
          )}
        </div>

        {/* Optional Parent Chapter Context */}
        {bookmark.parentTitle && (
          <div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--mono)",
                fontWeight: 700,
                background: "color-mix(in oklab, var(--yel) 35%, var(--paper))",
                border: "1px solid var(--ink)",
                padding: "1px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Zap size={10} /> {bookmark.parentTitle.slice(0, 28)}
            </span>
          </div>
        )}

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
                <AlertTriangle size={10} /> DRIFT
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
                <ShieldCheck size={10} /> 404 SAVED
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
