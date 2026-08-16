"use client";

import React, { useMemo, useState } from "react";
import { Bookmark, Collection, KindType, ViewMode } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { inColl } from "@/hooks/useBookmarks";
import { sigil } from "@/lib/sigil";
import { UserMenu } from "@/components/UserMenu";
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
} from "lucide-react";

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
  view?: ViewMode;
  setView?: (v: ViewMode) => void;
  onOpenCapture: () => void;
  onOpenNewFolder: () => void;
  onOpenImport: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  view,
  setView,
  onOpenCapture,
  onOpenNewFolder,
  onOpenImport,
  isMobileOpen = false,
  onCloseMobile,
  dischargeCount = 0,
  dischargePulseNonce = 0,
  dischargeReducedMotion = false,
}) => {
  const { isInstallable, promptInstall } = usePWA();
  const [shareCopied, setShareCopied] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const isColdStart = bookmarks.length > 0 && bookmarks.length < 15;

  const cnt = (cId: string) => bookmarks.filter((x) => inColl(x, cId, collections)).length;

  const typeCounts = useMemo(() => {
    const map: Partial<Record<KindType, number>> = {};
    bookmarks.forEach((x) => {
      map[x.ty] = (map[x.ty] || 0) + 1;
    });
    return map;
  }, [bookmarks]);

  // Single grouped aggregate calculation of queued minutes per Kind
  const kindQueuedMinutes = useMemo(() => {
    const map: Record<KindType, number> = {
      ART: 0, VID: 0, PLY: 0, GIT: 0, APP: 0, PPR: 0, DOC: 0,
    };
    bookmarks.forEach((x) => {
      map[x.ty] = (map[x.ty] || 0) + (x.mins || 0);
    });
    return map;
  }, [bookmarks]);

  const maxQueuedMinutes = useMemo(() => {
    const vals = Object.values(kindQueuedMinutes);
    return Math.max(...vals, 1);
  }, [kindQueuedMinutes]);

  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    bookmarks.forEach((x) => {
      if (x.tag) {
        map[x.tag] = (map[x.tag] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const unreadCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && x.unread).length;
  }, [bookmarks]);

  const archiveCount = useMemo(() => {
    return bookmarks.filter((x) => !x.isDeleted && !x.unread).length;
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
          <b>HOARD</b>
          <span>{bookmarks.length}</span>
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
                border: "2px solid #000",
                background: "#FFE600",
                padding: "2px 6px",
                cursor: "pointer",
                marginLeft: "4px",
              }}
            >
              + FOLDER
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
                border: "2px solid #000",
                background: shareCopied ? "#B6FF3C" : "#00F0FF",
                padding: "5px 8px",
                cursor: "pointer",
                margin: "4px 0 10px 0",
                boxShadow: "2px 2px 0 #000",
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
              const queuedMins = kindQueuedMinutes[k] || 0;
              const count = typeCounts[k] || 0;
              const isZero = count === 0 || queuedMins === 0;

              const barWidthPct = queuedMins > 0 ? Math.round(18 + (queuedMins / maxQueuedMinutes) * 82) : 0;
              const trailingLabel = queuedMins > 0 ? `${queuedMins}m` : "empty";

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

            <div className="ci">
              <span className="ic" style={{ background: "#FFE600", color: "#000", fontWeight: 800 }}>
                ⚠️
              </span>
              Duplicates
              <span className="n">{duplicateCount}</span>
            </div>

            <Link
              href="/til"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div
                className="ci"
                style={{ marginTop: "10px", background: "#FFE600", color: "#000", borderColor: "#000", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "#000", color: "#FFE600" }}>
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
                style={{ marginTop: "6px", background: "#00F0FF", borderColor: "#000", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "#000", color: "#00F0FF" }}>
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
              style={{ marginTop: "6px", background: "#FFE600", borderColor: "#000", fontWeight: "800" }}
            >
              <span className="ic" style={{ background: "#000", color: "#FFE600" }}>
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
                style={{ marginTop: "6px", background: "#B6FF3C", borderColor: "#000", fontWeight: "800" }}
              >
                <span className="ic" style={{ background: "#000", color: "#B6FF3C" }}>
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
              style={{ marginTop: "6px", background: "#FFFDF8", borderColor: "#000" }}
            >
              <span className="ic" style={{ background: "#000", color: "#fff" }}>
                ↓
              </span>
              EXPORT DATA
            </div>
          </div>
        </div>
        <UserMenu />
      </aside>
    </>
  );
};
