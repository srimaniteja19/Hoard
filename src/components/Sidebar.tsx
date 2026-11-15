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
  Newspaper,
  Share2,
  Check,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { buildLivingTopicClusters, LivingTopicCluster } from "@/lib/library/topicClustering";

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
  activeTopicCluster?: string | null;
  setActiveTopicCluster?: (c: string | null) => void;
  onOpenTopicHub?: (cluster: LivingTopicCluster) => void;
  onOpenGazette?: () => void;
  /** Session count of bookmarks discharged into TIL entries (SPECTACLE.md §4). */
  dischargeCount?: number;
  /** Bumped on each discharge to retrigger the counter pulse/cross-fade via key remount. */
  dischargePulseNonce?: number;
  dischargeReducedMotion?: boolean;
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
  activeTopicCluster,
  setActiveTopicCluster,
  onOpenTopicHub,
  onOpenGazette,
  dischargeCount = 0,
  dischargePulseNonce = 0,
  dischargeReducedMotion = false,
}) => {
  const { isInstallable, promptInstall } = usePWA();
  const [shareCopied, setShareCopied] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagFilterQuery, setTagFilterQuery] = useState("");
  const [topicsExpanded, setTopicsExpanded] = useState(true);

  const isColdStart = bookmarks.length > 0 && bookmarks.length < 15;

  const livingClusters = useMemo(() => {
    return buildLivingTopicClusters(bookmarks);
  }, [bookmarks]);

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
    if (setActiveTopicCluster) setActiveTopicCluster(null);
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

  const renderCollectionTree = (list: Collection[], depth = 0) => {
    return list.map((c) => (
      <React.Fragment key={c.id}>
        <div
          className={`ci ${depth > 0 ? "child" : ""} ${coll === c.id && view !== "archive" ? "on" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${12 + depth * 14}px` : undefined }}
          onClick={() => handleSelectCollection(c.id)}
          title={c.query ? `Smart Collection Query: ${c.query}` : undefined}
        >
          {c.query ? (
            <span className="ic" style={{ background: c.c }}>
              ⚡
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
            <span style={{ fontSize: "8.5px", opacity: 0.6, marginRight: "4px", fontFamily: "var(--mono)" }}>
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
    !activeTopicCluster &&
    !unreadOnly &&
    !neverOpenedOnly &&
    view !== "archive";

  return (
    <>
      {isMobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}

      <aside className={`side ${isMobileOpen ? "mobile-open" : ""}`}>
        {/* Mobile-only close header */}
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
            <span>VIEWS & SCOPES</span>
          </div>

          <div id="scopes">
            <div className={`ci ${isAllActive ? "on" : ""}`} onClick={handleSelectAll}>
              <span className="ic" style={{ background: "var(--yel)", color: "#000" }}>
                <Inbox size={11} strokeWidth={2.5} />
              </span>
              <span style={{ flex: 1 }}>All Bookmarks</span>
              <span
                key={`unread-${dischargePulseNonce}`}
                className={`n ${dischargePulseNonce > 0 ? (dischargeReducedMotion ? "counter-crossfade" : "counter-pulse") : ""}`}
              >
                {unreadCount}
              </span>
            </div>

            <div className={`ci ${unreadOnly ? "on" : ""}`} onClick={handleSelectUnread}>
              <span className="ic" style={{ background: "var(--pink)", color: "#fff" }}>
                ●
              </span>
              <span style={{ flex: 1 }}>Unread Queue</span>
              <span className="n">{unreadCount}</span>
            </div>

            <div className={`ci ${neverOpenedOnly ? "on" : ""}`} onClick={handleSelectNeverOpened}>
              <span className="ic" style={{ background: "var(--orange, #FF6B00)", color: "#000" }}>
                <AlertCircle size={11} strokeWidth={2.5} />
              </span>
              <span style={{ flex: 1 }}>Never Opened</span>
              <span className="n">{neverOpenedCount}</span>
            </div>

            <div
              className={`ci ${view === "archive" ? "on" : ""}`}
              onClick={() => {
                if (setView) setView(view === "archive" ? "grid" : "archive");
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <span className="ic" style={{ background: "var(--cyan)", color: "#000" }}>
                <Archive size={11} strokeWidth={2.5} />
              </span>
              <span style={{ flex: 1 }}>Archive Vault</span>
              <span className="n">{archiveCount}</span>
            </div>

            {dischargeCount > 0 && (
              <div
                className="ci"
                id="til-gains-counter"
                title="Bookmarks discharged into TIL entries this session"
              >
                <span className="ic" style={{ background: "var(--lime, #B6FF3C)", color: "#000" }}>
                  💡
                </span>
                <span style={{ flex: 1 }}>TIL Gains (Session)</span>
                <span
                  key={`gains-${dischargePulseNonce}`}
                  className={`n ${dischargePulseNonce > 0 ? (dischargeReducedMotion ? "counter-crossfade" : "counter-pulse") : ""}`}
                >
                  {dischargeCount}
                </span>
              </div>
            )}

            {/* Hidden anchor for FLIP animation when dischargeCount is 0 */}
            {dischargeCount === 0 && (
              <div id="til-gains-counter" style={{ height: 0, overflow: "hidden" }} aria-hidden="true" />
            )}
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

          {/* 3. Living Topic Clusters */}
          {livingClusters.length > 0 && (
            <>
              <div
                className="slbl"
                style={{ cursor: "pointer" }}
                onClick={() => setTopicsExpanded(!topicsExpanded)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  {topicsExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  TOPIC HUBS
                </span>
                <span style={{ fontSize: "9px", opacity: 0.6 }}>{livingClusters.length}</span>
              </div>

              {topicsExpanded && (
                <div id="topic-clusters">
                  {livingClusters.slice(0, 5).map((c) => {
                    const isSelected = activeTopicCluster === c.title;
                    return (
                      <div
                        key={c.id}
                        className={`ci ${isSelected ? "on" : ""}`}
                        onClick={() => {
                          if (setActiveTopicCluster) {
                            setActiveTopicCluster(isSelected ? null : c.title);
                          }
                          if (onCloseMobile) onCloseMobile();
                        }}
                      >
                        <span
                          className="ic"
                          style={{ background: c.color, color: "#000", fontWeight: 800 }}
                        >
                          {c.icon}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "12px",
                          }}
                        >
                          {c.title}
                        </span>
                        <span className="n">{c.unreadCount}</span>
                        {onOpenTopicHub && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTopicHub(c);
                            }}
                            title="Open Topic Hub Synthesis"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 2px",
                              fontSize: "11px",
                              opacity: 0.65,
                            }}
                          >
                            ↗
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 4. Searchable & Collapsible Tags */}
          <div className="slbl">
            <span>TAGS ({tagCounts.length})</span>
            {tag && (
              <button
                type="button"
                className="slbl-action"
                onClick={() => setTag(null)}
              >
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
                className={`tg ${tag === t ? "on" : ""}`}
                onClick={() => handleSelectTag(t)}
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
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  opacity: 0.68,
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
          {onOpenGazette && (
            <button
              type="button"
              className="side-util-btn"
              onClick={() => {
                onOpenGazette();
                if (onCloseMobile) onCloseMobile();
              }}
              title="Open The Hoard Gazette (Weekly Micro-Zine)"
            >
              <Newspaper size={11} /> GAZETTE
            </button>
          )}

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
            <Printer size={11} />
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
