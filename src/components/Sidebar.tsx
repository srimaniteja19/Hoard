"use client";

import React, { useMemo, useState } from "react";
import { Bookmark, Collection, KindType, ViewMode } from "@/types";
import { inColl } from "@/hooks/useBookmarks";
import { sigil } from "@/lib/sigil";
import { usePWA } from "@/components/PWAProvider";
import Link from "next/link";
import {
  Zap,
  Search,
  Plus,
  Archive,
  Inbox,
  Sparkles,
  Upload,
  Download,
  Printer,
  Share2,
  Check,
  AlertCircle,
} from "lucide-react";

interface SidebarProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  coll: string;
  setColl: (c: string) => void;
  ty: KindType | null;
  setTy: (t: KindType | null) => void;
  tag: string | null;
  setTag: (t: string | null) => void;
  unreadOnly: boolean;
  setUnreadOnly: (u: boolean) => void;
  neverOpenedOnly: boolean;
  setNeverOpenedOnly: (u: boolean) => void;
  view?: ViewMode;
  setView?: (v: ViewMode) => void;
  onOpenCapture: () => void;
  onOpenNewFolder: () => void;
  onOpenImport: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  bookmarks,
  collections,
  coll,
  setColl,
  ty,
  setTy,
  tag,
  setTag,
  unreadOnly,
  setUnreadOnly,
  neverOpenedOnly,
  setNeverOpenedOnly,
  view,
  setView,
  onOpenCapture,
  onOpenNewFolder,
  onOpenImport,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { isInstallable, promptInstall } = usePWA();
  const [shareCopied, setShareCopied] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagFilterQuery, setTagFilterQuery] = useState("");

  const isColdStart = bookmarks.length > 0 && bookmarks.length < 15;

  const activeBookmarks = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && x.unread);
  }, [bookmarks]);

  const cnt = (cId: string) => activeBookmarks.filter((x) => inColl(x, cId, collections)).length;

  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeBookmarks.forEach((x) => {
      if (x.tag) {
        map[x.tag] = (map[x.tag] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeBookmarks]);

  const filteredTagCounts = useMemo(() => {
    const q = tagFilterQuery.trim().toLowerCase().replace(/^#/, "");
    if (!q) return tagCounts;
    return tagCounts.filter(([t]) => t.toLowerCase().includes(q));
  }, [tagCounts, tagFilterQuery]);

  const visibleTags = useMemo(() => {
    if (showAllTags || tagFilterQuery.trim().length > 0) return filteredTagCounts;
    return filteredTagCounts.slice(0, 12);
  }, [filteredTagCounts, showAllTags, tagFilterQuery]);

  const unreadCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && x.unread).length;
  }, [bookmarks]);

  const archiveCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && !x.unread).length;
  }, [bookmarks]);

  const neverOpenedCount = useMemo(() => {
    return bookmarks.filter(
      (x) => !x.isDeleted && x.itemType === "REFERENCE" && (x.useCount ?? 0) === 0
    ).length;
  }, [bookmarks]);

  const handleSelectAll = () => {
    setColl("all");
    setTy(null);
    setTag(null);
    setUnreadOnly(false);
    setNeverOpenedOnly(false);
    if (view === "archive" && setView) setView("grid");
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectCollection = (cId: string) => {
    setColl(cId);
    if (view === "archive" && setView) setView("grid");
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectTag = (t: string) => {
    setTag(tag === t ? null : t);
    if (view === "archive" && setView) setView("grid");
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectUnread = () => {
    setUnreadOnly(!unreadOnly);
    setNeverOpenedOnly(false);
    if (view === "archive" && setView) setView("grid");
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectNeverOpened = () => {
    setNeverOpenedOnly(!neverOpenedOnly);
    setUnreadOnly(false);
    if (view === "archive" && setView) setView("grid");
    if (onCloseMobile) onCloseMobile();
  };

  const handleShareCurrentCollection = () => {
    const shareUrl = `${window.location.origin}/share/${coll}`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const renderCollectionTree = (list: Collection[], depth = 0) => {
    return list.map((c) => (
      <React.Fragment key={c.id}>
        <div
          role="button"
          tabIndex={0}
          className={`ci ${depth > 0 ? "child" : ""} ${coll === c.id && view !== "archive" ? "on" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${12 + depth * 14}px` : undefined }}
          onClick={() => handleSelectCollection(c.id)}
          onKeyDown={(e) => handleRowKeyDown(e, () => handleSelectCollection(c.id))}
          title={c.query ? `Smart Collection Query: ${c.query}` : undefined}
        >
          {c.query ? (
            <span className="ic" style={{ background: c.c, color: "#000" }}>
              <Zap size={11} strokeWidth={2.5} />
            </span>
          ) : (
            <span
              className="ic"
              style={{ overflow: "hidden" }}
              dangerouslySetInnerHTML={{ __html: sigil(c.name, 20).svg }}
            />
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {c.name}
          </span>
          {c.query && (
            <span
              style={{
                fontSize: "11px",
                opacity: 0.68,
                marginRight: "4px",
                fontFamily: "var(--mono)",
              }}
            >
              LIVE
            </span>
          )}
          <span className="n">{cnt(c.id)}</span>
        </div>
        {c.kids && renderCollectionTree(c.kids, depth + 1)}
      </React.Fragment>
    ));
  };

  const isAllActive =
    coll === "all" &&
    ty === null &&
    tag === null &&
    !unreadOnly &&
    !neverOpenedOnly &&
    view !== "archive";

  return (
    <>
      {isMobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}

      <aside className={`side ${isMobileOpen ? "mobile-open" : ""}`}>
        {isMobileOpen && onCloseMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "2px solid var(--ink)",
              background: "var(--yel)",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "12px",
            }}
          >
            <span>LIBRARY NAVIGATION</span>
            <button
              onClick={onCloseMobile}
              style={{
                border: "1.5px solid var(--ink)",
                background: "var(--paper)",
                padding: "2px 7px",
                fontWeight: 800,
                cursor: "pointer",
              }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Primary Actions: Save Link + Focus Session */}
        <div className="side-top-actions">
          <button
            type="button"
            className="side-save-btn"
            onClick={() => {
              onOpenCapture();
              if (onCloseMobile) onCloseMobile();
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Plus size={13} strokeWidth={2.8} /> SAVE LINK
            </span>
            <kbd>⌘N</kbd>
          </button>

          <Link
            href="/session"
            className="side-session-btn"
            title="Start distraction-free Focus Session"
          >
            <Zap size={12} fill="currentColor" /> FOCUS
          </Link>
        </div>

        <div className="sidescroll">
          {/* 1. Smart Scopes */}
          <div className="slbl">
            <span>SCOPES</span>
          </div>

          <div id="scopes">
            <div
              role="button"
              tabIndex={0}
              className={`ci ${isAllActive ? "on" : ""}`}
              onClick={handleSelectAll}
              onKeyDown={(e) => handleRowKeyDown(e, handleSelectAll)}
            >
              <span className="ic" style={{ background: "var(--yel)", color: "#000" }}>
                <Inbox size={11} strokeWidth={2.5} />
              </span>
              <span style={{ flex: 1 }}>All Bookmarks</span>
              <span className="n">{unreadCount}</span>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={`ci ${unreadOnly && view !== "archive" ? "on" : ""}`}
              onClick={handleSelectUnread}
              onKeyDown={(e) => handleRowKeyDown(e, handleSelectUnread)}
            >
              <span className="ic" style={{ background: "var(--pink)", color: "#fff" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "currentColor",
                    display: "inline-block",
                  }}
                />
              </span>
              <span style={{ flex: 1 }}>Unread Queue</span>
              <span className="n">{unreadCount}</span>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={`ci ${neverOpenedOnly && view !== "archive" ? "on" : ""}`}
              onClick={handleSelectNeverOpened}
              onKeyDown={(e) => handleRowKeyDown(e, handleSelectNeverOpened)}
            >
              <span className="ic" style={{ background: "var(--orange, #FF6B00)", color: "#000" }}>
                <AlertCircle size={11} strokeWidth={2.5} />
              </span>
              <span style={{ flex: 1 }}>Never Opened</span>
              <span className="n">{neverOpenedCount}</span>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={`ci ${view === "archive" ? "on" : ""}`}
              onClick={() => {
                if (setView) setView(view === "archive" ? "grid" : "archive");
                if (onCloseMobile) onCloseMobile();
              }}
              onKeyDown={(e) =>
                handleRowKeyDown(e, () => {
                  if (setView) setView(view === "archive" ? "grid" : "archive");
                  if (onCloseMobile) onCloseMobile();
                })
              }
            >
              <span className="ic" style={{ background: "var(--cyan)", color: "#000" }}>
                <Archive size={11} strokeWidth={2.5} />
              </span>
              <span style={{ flex: 1 }}>Archive Vault</span>
              <span className="n">{archiveCount}</span>
            </div>
          </div>

          {/* 2. Collections / Folders */}
          <div className="slbl">
            <span>COLLECTIONS</span>
            <button
              type="button"
              className="slbl-action"
              onClick={() => {
                onOpenNewFolder();
                if (onCloseMobile) onCloseMobile();
              }}
            >
              + NEW
            </button>
          </div>

          <div id="colls">
            {renderCollectionTree(
              isColdStart && !showAllCollections
                ? collections.filter((c) => cnt(c.id) > 0)
                : collections
            )}
          </div>

          {isColdStart && !showAllCollections && collections.some((c) => cnt(c.id) === 0) && (
            <button
              type="button"
              onClick={() => setShowAllCollections(true)}
              style={{
                width: "calc(100% - 16px)",
                margin: "4px 8px",
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 700,
                border: "1px dashed var(--ink)",
                background: "transparent",
                color: "var(--ink)",
                padding: "4px 8px",
                cursor: "pointer",
                opacity: 0.65,
              }}
            >
              + Show {collections.filter((c) => cnt(c.id) === 0).length} empty folders
            </button>
          )}

          {coll !== "all" && (
            <div style={{ padding: "4px 8px" }}>
              <button
                type="button"
                onClick={handleShareCurrentCollection}
                style={{
                  width: "100%",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  border: "1.5px solid var(--ink)",
                  background: shareCopied ? "var(--lime)" : "var(--paper)",
                  color: "var(--ink)",
                  padding: "5px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  boxShadow: "1.5px 1.5px 0 var(--ink)",
                }}
              >
                {shareCopied ? <Check size={11} /> : <Share2 size={11} />}
                {shareCopied ? "SHARE LINK COPIED" : "SHARE COLLECTION"}
              </button>
            </div>
          )}

          {/* 3. Searchable & Collapsible Tags */}
          <div className="slbl">
            <span>TAGS ({tagCounts.length})</span>
            {tag && (
              <button type="button" className="slbl-action" onClick={() => setTag(null)}>
                CLEAR
              </button>
            )}
          </div>

          {tagCounts.length > 8 && (
            <div className="side-tag-search">
              <Search size={11} />
              <input
                type="text"
                value={tagFilterQuery}
                onChange={(e) => setTagFilterQuery(e.target.value)}
                placeholder="Filter #tags..."
                aria-label="Filter tags"
              />
            </div>
          )}

          <div className="tagwrap" id="tags">
            {visibleTags.map(([t, n]) => (
              <span
                key={t}
                role="button"
                tabIndex={0}
                className={`tg ${tag === t ? "on" : ""}`}
                onClick={() => handleSelectTag(t)}
                onKeyDown={(e) => handleRowKeyDown(e, () => handleSelectTag(t))}
              >
                <span>#{t}</span>
                <span className="tg-count">{n}</span>
              </span>
            ))}
          </div>

          {!tagFilterQuery && tagCounts.length > 12 && (
            <div style={{ padding: "2px 12px 8px" }}>
              <button
                type="button"
                onClick={() => setShowAllTags(!showAllTags)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  opacity: 0.72,
                  cursor: "pointer",
                  padding: "2px 0",
                  textDecoration: "underline",
                }}
              >
                {showAllTags ? "Show fewer tags" : `+ Show all ${tagCounts.length} tags`}
              </button>
            </div>
          )}
        </div>

        {/* Quiet Library Utilities Footer */}
        <div className="side-footer">
          <button
            type="button"
            className="side-util-btn"
            onClick={() => {
              onOpenImport();
              if (onCloseMobile) onCloseMobile();
            }}
            title="Import Bookmarks"
          >
            <Upload size={11} /> IMPORT
          </button>

          <button
            type="button"
            className="side-util-btn"
            onClick={() => {
              window.open("/api/export", "_blank");
              if (onCloseMobile) onCloseMobile();
            }}
            title="Export Library Data"
          >
            <Download size={11} /> EXPORT
          </button>

          <button
            type="button"
            className="side-util-btn"
            onClick={() => window.print()}
            title="Print Current Shelf"
          >
            <Printer size={11} /> PRINT
          </button>

          {isInstallable && (
            <button
              type="button"
              className="side-util-btn"
              onClick={() => {
                promptInstall();
                if (onCloseMobile) onCloseMobile();
              }}
              title="Install PWA"
            >
              <Sparkles size={11} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
