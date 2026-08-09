"use client";

import React, { useMemo, useState } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { inColl } from "@/hooks/useBookmarks";
import { UserMenu } from "@/components/UserMenu";
import { usePWA } from "@/components/PWAProvider";
import Link from "next/link";
import { Zap } from "lucide-react";

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
  onOpenCapture: () => void;
  onOpenNewFolder: () => void;
  onOpenImport: () => void;
  onOpenFocusMode?: () => void;
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
  onOpenCapture,
  onOpenNewFolder,
  onOpenImport,
  onOpenFocusMode,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { isInstallable, promptInstall } = usePWA();
  const [shareCopied, setShareCopied] = useState(false);

  const cnt = (cId: string) => bookmarks.filter((x) => inColl(x, cId, collections)).length;

  const typeCounts = useMemo(() => {
    const map: Partial<Record<KindType, number>> = {};
    bookmarks.forEach((x) => {
      map[x.ty] = (map[x.ty] || 0) + 1;
    });
    return map;
  }, [bookmarks]);

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
    return bookmarks.filter((x) => x.unread).length;
  }, [bookmarks]);

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dups = 0;
    bookmarks.forEach((b) => {
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
          <span className="ic" style={{ background: c.c }}>
            {c.query ? "⚡" : c.ic}
          </span>
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

        {/* ⚡ Start Focus Session Button */}
        {onOpenFocusMode && (
          <button
            onClick={() => {
              onOpenFocusMode();
              if (onCloseMobile) onCloseMobile();
            }}
            style={{
              width: "100%",
              background: "#FFE600",
              color: "#000",
              border: "3px solid #000",
              boxShadow: "3px 3px 0 #000",
              padding: "10px",
              fontWeight: 900,
              fontFamily: "var(--mono)",
              fontSize: "13px",
              cursor: "pointer",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Zap size={16} fill="#000" /> START FOCUS SESSION
          </button>
        )}

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
          <div id="colls">{renderCollectionTree(collections)}</div>

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

          <div className="slbl">
            KIND<i></i>
          </div>
          <div id="kinds">
            {(Object.keys(TYPES) as KindType[]).map((k) => {
              const v = TYPES[k];
              return (
                <div
                  key={k}
                  className={`ci ${ty === k ? "on" : ""}`}
                  onClick={() => handleSelectType(k)}
                >
                  <span className="ic" style={{ background: v.c }}>
                    {k[0]}
                  </span>
                  {v.name}
                  <span className="n">{typeCounts[k] || 0}</span>
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
              <span className="n">{unreadCount}</span>
            </div>

            <div className="ci">
              <span className="ic" style={{ background: "#FFE600", color: "#000", fontWeight: 800 }}>
                ⚠️
              </span>
              Duplicates
              <span className="n">{duplicateCount}</span>
            </div>

            <Link
              href="/stats"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div
                className="ci"
                style={{ marginTop: "10px", background: "#00F0FF", borderColor: "#000", fontWeight: "800" }}
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
