"use client";

import React, { useState } from "react";
import { SortMode, ViewMode } from "@/types";
import { Zap, Search } from "lucide-react";
import Link from "next/link";

interface HeaderBarProps {
  query: string;
  setQuery: (q: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  onOpenCaptureWithUrl: (url: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenCapture?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  query,
  setQuery,
  view,
  setView,
  sort,
  setSort,
  onOpenCaptureWithUrl,
  searchInputRef,
  onOpenCapture,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/^https?:\/\//i.test(v.trim())) {
      onOpenCaptureWithUrl(v.trim());
      setQuery("");
      return;
    }
    setQuery(v);
  };

  return (
    <div className="bar">
      <div className="mobile-header-strip">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="mobile-find-btn"
          style={{
            background: showMobileFilters ? "var(--lime)" : "var(--paper)",
            border: "2px solid var(--ink)",
            color: "var(--ink)",
            height: "32px",
            padding: "0 10px",
            fontWeight: 800,
            fontSize: "11px",
            fontFamily: "var(--mono)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "2px 2px 0 var(--ink)",
            whiteSpace: "nowrap",
          }}
          title="Search & View Settings"
        >
          <Search size={13} /> {showMobileFilters ? "✕ CLOSE" : "FIND"}
        </button>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Link
            href="/session"
            style={{
              background: "#FFE600",
              color: "#000",
              border: "2px solid var(--ink)",
              height: "32px",
              padding: "0 10px",
              fontWeight: 900,
              fontSize: "11px",
              fontFamily: "var(--mono)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "2px 2px 0 var(--ink)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Zap size={12} fill="#000" /> SESSION
          </Link>

          {onOpenCapture && (
            <button
              className="mobile-add-btn"
              onClick={onOpenCapture}
              style={{
                height: "32px",
                padding: "0 10px",
                fontSize: "11px",
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
              aria-label="Save link"
            >
              + LINK
            </button>
          )}
        </div>
      </div>

      <div className={`mobile-collapsible-controls ${showMobileFilters ? "open" : ""}`}>
        <div className="searchbox">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            ref={searchInputRef}
            value={query}
            onChange={handleInput}
            placeholder="Search — try  is:video  #ai  lang:ts"
            autoComplete="off"
          />
        </div>

        <div className="bar-controls-row">
          <Link href="/session" className="desktop-start-session-btn">
            <Zap size={13} fill="#000" /> START SESSION
          </Link>

          <div className="grp view-grp">
            <button className={view === "masonry" ? "on" : ""} onClick={() => setView("masonry")}>
              MASONRY
            </button>
            <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}>
              GRID
            </button>
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
              LIST
            </button>
            <button className={view === "heads" ? "on" : ""} onClick={() => setView("heads")}>
              HEADLINES
            </button>
            <button className={view === "archive" ? "on" : ""} onClick={() => setView("archive")}>
              ARCHIVE
            </button>
          </div>

          <div className="grp sort-grp">
            <button className={sort === "recent" ? "on" : ""} onClick={() => setSort("recent")}>
              RECENTLY SAVED
            </button>
            <button className={sort === "mostUsed" ? "on" : ""} onClick={() => setSort("mostUsed")}>
              MOST USED
            </button>
            <button className={sort === "recentlyUsed" ? "on" : ""} onClick={() => setSort("recentlyUsed")}>
              RECENTLY USED
            </button>
            <button className={sort === "az" ? "on" : ""} onClick={() => setSort("az")}>
              A–Z
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
