"use client";

import React, { useMemo, useState } from "react";
import { Bookmark, Collection, KindType, ViewMode } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { inColl } from "@/hooks/useBookmarks";
import { sigil } from "@/lib/sigil";
import { usePWA } from "@/components/PWAProvider";
import Link from "next/link";
import {
  FileText,
  Film,
  Headphones,
  FolderGit2,
  AppWindow,
  GraduationCap,
  BookOpen,
  Layers,
  Sparkles,
} from "lucide-react";
import { buildLivingTopicClusters, LivingTopicCluster } from "@/lib/library/topicClustering";

const KIND_GLYPHS: Record<KindType, React.ReactNode> = {
  ART: <FileText size={12} strokeWidth={2.5} />,
  VID: <Film size={12} strokeWidth={2.5} />,
  PLY: <Headphones size={12} strokeWidth={2.5} />,
  GIT: <FolderGit2 size={12} strokeWidth={2.5} />,
  APP: <AppWindow size={12} strokeWidth={2.5} />,
  PPR: <GraduationCap size={12} strokeWidth={2.5} />,
  DOC: <BookOpen size={12} strokeWidth={2.5} />,
};

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
  const isColdStart = bookmarks.length > 0 && bookmarks.length < 15;

  const livingClusters = useMemo(() => {
    return buildLivingTopicClusters(bookmarks);
  }, [bookmarks]);

  const activeBookmarks = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && x.unread);
  }, [bookmarks]);

  const cnt = (cId: string) => activeBookmarks.filter((x) => inColl(x, cId, collections)).length;

  const typeCounts = useMemo(() => {
    const map: Partial<Record<KindType, number>> = {};
    activeBookmarks.forEach((x) => {
      map[x.ty] = (map[x.ty] || 0) + 1;
    });
    return map;
  }, [activeBookmarks]);

  const maxTypeCount = useMemo(() => {
    const vals = Object.values(typeCounts);
    return Math.max(...vals, 1);
  }, [typeCounts]);

  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeBookmarks.forEach((x) => {
      if (x.tag) {
        map[x.tag] = (map[x.tag] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeBookmarks]);

  const unreadCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && x.unread).length;
  }, [bookmarks]);

  const archiveCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && !x.unread).length;
  }, [bookmarks]);

  const neverOpenedCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && x.itemType === "REFERENCE" && (x.useCount ?? 0) === 0).length;
  }, [bookmarks]);

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dups = 0;
    bookmarks.forEach((b) => {
      if (b.isDeleted) return;
      const norm = b.url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      if (seen.has(norm)) dups++;
      else seen.add(norm);
    });
    return dups;
  }, [bookmarks]);

  const handleSelectCollection = (cId: string) => {
    setColl(cId);
    setTy(null);
    setTag(null);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectType = (k: KindType) => {
    setTy(ty === k ? null : k);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectTag = (t: string) => {
    setTag(tag === t ? null : t);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectUnread = () => {
    setUnreadOnly(!unreadOnly);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectNeverOpened = () => {
    setNeverOpenedOnly(!neverOpenedOnly);
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
          className={`ci ${depth > 0 ? "child" : ""} ${coll === c.id ? "on" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${14 + depth * 14}px` : undefined }}
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
              dangerouslySetInnerHTML={{ __html: sigil(c.name, 22).svg }}
            />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {c.name}
          </span>
          {c.query && <span style={{ fontSize: "9px", opacity: 0.6, marginRight: "4px" }}>LIVE</span>}
          <span className="n">{cnt(c.id)}</span>
        </div>
        {c.kids && renderCollectionTree(c.kids, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`side ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="logo">
          <Link
            href="/library"
            className="logo-home"
            onClick={() => {
              setColl("all");
              setTy(null);
              setTag(null);
              setUnreadOnly(false);
              setNeverOpenedOnly(false);
              onCloseMobile?.();
            }}
          >
            <b>HOARD</b>
          </Link>
          <span>{unreadCount}</span>
          {onCloseMobile && (
            <button
              className="mobile-side-close"
              onClick={onCloseMobile}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        <button
          className="addbtn"
          onClick={() => {
            onOpenCapture();
            if (onCloseMobile) onCloseMobile();
          }}
        >
          SAVE A LINK <kbd>⌘N</kbd>
        </button>

        <div className="sidescroll">
          <div className="slbl" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
              COLLECTIONS<i></i>
            </div>
            <button
              onClick={() => {
                onOpenNewFolder();
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9px",
                fontWeight: 800,
                border: "2px solid var(--ink)",
                background: "#FFE600",
                padding: "6px 8px",
                cursor: "pointer",
                marginLeft: "4px",
                minHeight: "36px",
              }}
            >
              + FOLDER
            </button>
          </div>
          <div id="colls">
            <div
              className={`ci ${coll === "all" && ty === null && tag === null && !unreadOnly && !neverOpenedOnly ? "on" : ""}`}
              onClick={() => {
                setColl("all");
                setTy(null);
                setTag(null);
                setUnreadOnly(false);
                setNeverOpenedOnly(false);
                if (onCloseMobile) onCloseMobile();
              }}
              style={{ fontWeight: 800 }}
            >
              <span className="ic" style={{ background: "var(--ink)", color: "#FFE600", fontWeight: 900 }}>
                ⚡
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                All Bookmarks (Full Shelf)
              </span>
              <span className="n">{activeBookmarks.length}</span>
            </div>
            {renderCollectionTree(
              isColdStart && !showAllCollections
                ? collections.filter((c) => cnt(c.id) > 0)
                : collections
            )}
          </div>

          {isColdStart && !showAllCollections && collections.some((c) => cnt(c.id) === 0) && (
            <button
              onClick={() => setShowAllCollections(true)}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "9px",
                fontWeight: 800,
                border: "2px solid var(--fg)",
                background: "var(--paper)",
                color: "var(--fg)",
                padding: "4px 8px",
                cursor: "pointer",
                margin: "2px 0 8px 0",
                opacity: 0.7,
              }}
            >
              SHOW {collections.filter((c) => cnt(c.id) === 0).length} EMPTY COLLECTION
              {collections.filter((c) => cnt(c.id) === 0).length === 1 ? "" : "S"}
            </button>
          )}

          {/* Share Collection Button if a specific collection is selected */}
          {coll !== "all" && (
            <button
              onClick={handleShareCurrentCollection}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                border: "2px solid var(--ink)",
                background: shareCopied ? "#B6FF3C" : "#00F0FF",
                padding: "5px 8px",
                cursor: "pointer",
                margin: "4px 0 10px 0",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              {shareCopied ? "✓ SHARE LINK COPIED!" : "🔗 SHARE COLLECTION"}
            </button>
          )}

          <button
            onClick={() => window.print()}
            style={{
              width: "100%",
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              border: "2px solid var(--fg)",
              background: "var(--paper)",
              color: "var(--fg)",
              padding: "5px 8px",
              cursor: "pointer",
              margin: "4px 0 10px 0",
              boxShadow: "2px 2px 0 var(--fg)",
            }}
          >
            🖨️ PRINT COLLECTION
          </button>

          <div className="slbl">
            KIND<i></i>
          </div>
          <div id="kinds">
            {(Object.keys(TYPES) as KindType[]).map((k) => {
              const v = TYPES[k];
              const count = typeCounts[k] || 0;
              const isZero = count === 0;

              const barWidthPct = count > 0 ? Math.round(18 + (count / maxTypeCount) * 82) : 0;
              const trailingLabel = count > 0 ? `${count}` : "0";

              return (
                <div
                  key={k}
                  className={`ci kind-row ${ty === k ? "on" : ""} ${isZero ? "dimmed" : ""}`}
                  data-kind={k}
                  onClick={() => handleSelectType(k)}
                >
                  {barWidthPct > 0 && (
                    <div
                      className="occupancy-bar"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  )}
                  <span className="ic" data-kind={k}>
                    {KIND_GLYPHS[k]}
                  </span>
                  <span style={{ position: "relative", zIndex: 1, flex: 1 }}>{v.name}</span>
                  <span className="n" style={{ position: "relative", zIndex: 1 }}>{trailingLabel}</span>
                </div>
              );
            })}
          </div>

          {/* 🏷️ Living Topic Clusters */}
          {livingClusters.length > 0 && (
            <>
              <div className="slbl" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  TOPIC CLUSTERS<i></i>
                </div>
                <span style={{ fontSize: "9px", fontFamily: "var(--mono)", opacity: 0.6 }}>LIVING HUBS</span>
              </div>

              <div id="topic-clusters" style={{ display: "grid", gap: "2px", marginBottom: "8px" }}>
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
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span className="ic" style={{ background: c.color, color: "#000", fontWeight: 800 }}>
                        {c.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", fontWeight: isSelected ? 800 : 700 }}>
                          {c.title}
                        </div>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "9px", opacity: 0.75 }}>
                          <span>{c.densityLevel}</span>
                          <span>·</span>
                          <span>{c.unreadCount > 0 ? `🔥 ${c.unreadCount} unread` : "✓ Explored"}</span>
                        </div>
                      </div>

                      {onOpenTopicHub && (
                        <button
                          className="cluster-hub-open-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTopicHub(c);
                          }}
                          title="Open Topic Hub Details"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 4px",
                            opacity: 0.6,
                          }}
                        >
                          ↗
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="slbl">
            TAGS<i></i>
          </div>
          <div className="tagwrap" id="tags">
            {tagCounts.map(([t, n]) => (
              <span
                key={t}
                className={`tg ${tag === t ? "on" : ""}`}
                onClick={() => handleSelectTag(t)}
              >
                #{t} {n}
              </span>
            ))}
          </div>

          <div className="slbl">
            TOOLS & FILTERS<i></i>
          </div>
          <div id="filters">
            <div
              className={`ci ${unreadOnly ? "on" : ""}`}
              onClick={handleSelectUnread}
            >
              <span className="ic" style={{ background: "#FF007A" }}></span>
              Unread only
              <span
                key={`unread-${dischargePulseNonce}`}
                className={`n ${dischargePulseNonce > 0 ? (dischargeReducedMotion ? "counter-crossfade" : "counter-pulse") : ""}`}
              >
                {unreadCount}
              </span>
            </div>

            <div
              className={`ci ${neverOpenedOnly ? "on" : ""}`}
              onClick={handleSelectNeverOpened}
            >
              <span className="ic" style={{ background: "var(--orange, #FF6B00)" }}></span>
              Never opened
              <span className="n">{neverOpenedCount}</span>
            </div>

            <div className="ci" id="til-gains-counter" title="Bookmarks discharged into TIL entries this session">
              <span className="ic" style={{ background: "var(--lime, #B6FF3C)" }}>💡</span>
              TIL gains (session)
              <span
                key={`gains-${dischargePulseNonce}`}
                className={`n ${dischargePulseNonce > 0 ? (dischargeReducedMotion ? "counter-crossfade" : "counter-pulse") : ""}`}
              >
                {dischargeCount}
              </span>
            </div>

            <div
              className={`ci ${view === "archive" ? "on" : ""}`}
              onClick={() => {
                if (setView) setView(view === "archive" ? "masonry" : "archive");
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                background: view === "archive" ? "var(--yel, #FFE600)" : undefined,
                color: view === "archive" ? "#000" : undefined,
                fontWeight: view === "archive" ? 800 : undefined,
              }}
            >
              <span className="ic" style={{ background: "var(--yel, #FFE600)", color: "#000", fontWeight: 800 }}>
                🗄️
              </span>
              Archive Vault
              <span className="n">{archiveCount}</span>
            </div>

            <div
              className="ci"
              onClick={() => {
                if (onOpenGazette) onOpenGazette();
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                background: "var(--cream)",
                border: "1.5px solid var(--ink)",
                boxShadow: "2px 2px 0 var(--ink)",
                margin: "4px 0",
              }}
            >
              <span className="ic" style={{ background: "var(--yel)", color: "#000", fontWeight: 900 }}>
                📰
              </span>
              The Hoard Gazette
              <span className="n" style={{ background: "var(--lime)", color: "#000", fontSize: "9px" }}>
                SUNDAY ZINE
              </span>
            </div>

            <div className="ci">
              <span className="ic" style={{ background: "#FFE600", color: "#000", fontWeight: 800 }}>
                ⚠️
              </span>
              Duplicates
              <span className="n">{duplicateCount}</span>
            </div>

            <Link
              href="/todos"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div
                className="ci"
                style={{ marginTop: "10px", background: "#B6FF3C", color: "#000", borderColor: "var(--ink)", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "var(--ink)", color: "#B6FF3C" }}>
                  ✓
                </span>
                TODOS
              </div>
            </Link>

            <Link
              href="/til"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div
                className="ci"
                style={{ marginTop: "6px", background: "#FFE600", color: "#000", borderColor: "var(--ink)", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "var(--ink)", color: "#FFE600" }}>
                  💡
                </span>
                TODAY I LEARNED (TIL)
              </div>
            </Link>

            <Link
              href="/stats"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div
                className="ci"
                style={{ marginTop: "6px", background: "#00F0FF", borderColor: "var(--ink)", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "var(--ink)", color: "#00F0FF" }}>
                  📊
                </span>
                ANALYTICS DASHBOARD
              </div>
            </Link>

            <div
              className="ci"
              onClick={() => {
                onOpenImport();
                if (onCloseMobile) onCloseMobile();
              }}
              style={{ marginTop: "6px", background: "#FFE600", borderColor: "var(--ink)", fontWeight: "800" }}
            >
              <span className="ic" style={{ background: "var(--ink)", color: "#FFE600" }}>
                ↑
              </span>
              IMPORT BOOKMARKS
            </div>

            {isInstallable && (
              <div
                className="ci"
                onClick={() => {
                  promptInstall();
                  if (onCloseMobile) onCloseMobile();
                }}
                style={{ marginTop: "6px", background: "#B6FF3C", borderColor: "var(--ink)", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "var(--ink)", color: "#B6FF3C" }}>
                  ⚡
                </span>
                INSTALL APP
              </div>
            )}

            <div
              className="ci"
              onClick={() => {
                window.open("/api/export", "_blank");
                if (onCloseMobile) onCloseMobile();
              }}
              style={{ marginTop: "6px", background: "var(--paper)", borderColor: "var(--ink)" }}
            >
              <span className="ic" style={{ background: "var(--ink)", color: "#fff" }}>
                ↓
              </span>
              EXPORT DATA
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
