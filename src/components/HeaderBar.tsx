"use client";

import React, { useState } from "react";
import { SortMode, ViewMode } from "@/types";
import { ThemePicker } from "@/components/ThemePicker";
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
  onToggleMobileSidebar?: () => void;
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
  onToggleMobileSidebar,
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
      {/* Mobile Top Header Strip */}
      <div className="mobile-header-strip">
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            className="mobile-menu-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Open navigation menu"
          >
            <span>☰</span> MENU
          </button>

          <div className="mobile-brand">
            <b>HOARD</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            style={{
              background: showMobileFilters ? "#B6FF3C" : "#FFFDF8",
              border: "2px solid #000",
              padding: "5px 7px",
              fontWeight: 800,
              fontSize: "11px",
              fontFamily: "var(--mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px",
              boxShadow: "2px 2px 0 #000",
            }}
            title="Search & View Settings"
          >
            <Search size={13} /> {showMobileFilters ? "✕" : "FIND"}
          </button>

          <Link
            href="/session"
            style={{
              background: "#FFE600",
              color: "#000",
              border: "2px solid #000",
              padding: "5px 7px",
              fontWeight: 900,
              fontSize: "11px",
              fontFamily: "var(--mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px",
              boxShadow: "2px 2px 0 #000",
              textDecoration: "none",
            }}
          >
            <Zap size={12} fill="#000" /> SESSION
          </Link>

          {onOpenCapture && (
            <button
              className="mobile-add-btn"
              onClick={onOpenCapture}
              aria-label="Save link"
            >
              + LINK
            </button>
          )}
        </div>
      </div>

      {/* Search box & controls (hidden on mobile unless expanded or on desktop) */}
      <div className={`mobile-collapsible-controls ${showMobileFilters ? "open" : ""}`}>
        <div className="searchbox">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000"
            strokeWidth="3"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            ref={searchInputRef}
            value={query}
            onChange={handleInput}
            placeholder="Search — try  is:video  under:20m  #ai  lang:ts"
            autoComplete="off"
          />
        </div>

        <div className="bar-controls-row">
          <Link
            href="/session"
            style={{
              background: "#FFE600",
              color: "#000",
              border: "2px solid #000",
              boxShadow: "2px 2px 0 #000",
              padding: "5px 12px",
              fontWeight: 900,
              fontFamily: "var(--mono)",
              fontSize: "12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
            }}
          >
            <Zap size={14} fill="#000" /> START SESSION
          </Link>

          <div className="grp view-grp">
            <button
              className={view === "masonry" ? "on" : ""}
              onClick={() => setView("masonry")}
            >
              MASONRY
            </button>
            <button
              className={view === "grid" ? "on" : ""}
              onClick={() => setView("grid")}
            >
              GRID
            </button>
            <button
              className={view === "list" ? "on" : ""}
              onClick={() => setView("list")}
            >
              LIST
            </button>
            <button
              className={view === "heads" ? "on" : ""}
              onClick={() => setView("heads")}
            >
              HEADLINES
            </button>
            <button
              className={view === "archive" ? "on" : ""}
              onClick={() => setView("archive")}
              style={{
                background: view === "archive" ? "var(--yel, #FFE600)" : undefined,
                color: view === "archive" ? "#000" : undefined,
              }}
            >
              🗄️ ARCHIVE
            </button>
          </div>

          <div className="grp sort-grp">
            <button
              className={sort === "recent" ? "on" : ""}
              onClick={() => setSort("recent")}
            >
              RECENT
            </button>
            <button
              className={sort === "short" ? "on" : ""}
              onClick={() => setSort("short")}
            >
              SHORTEST
            </button>
            <button
              className={sort === "az" ? "on" : ""}
              onClick={() => setSort("az")}
            >
              A–Z
            </button>
          </div>

          <ThemePicker />
        </div>
      </div>
    </div>
  );
};
