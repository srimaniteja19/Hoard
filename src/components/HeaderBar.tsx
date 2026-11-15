"use client";

import React, { useMemo } from "react";
import { Bookmark, Collection, KindType, SortMode, ViewMode } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import {
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  List,
  Table2,
  ChevronDown,
  X,
  FileText,
  Film,
  Headphones,
  FolderGit2,
  AppWindow,
  GraduationCap,
  BookOpen,
  Folder,
  Tag,
  Zap,
} from "lucide-react";
import Link from "next/link";

const KIND_ICONS: Record<KindType, React.ReactNode> = {
  ART: <FileText size={11} strokeWidth={2.3} />,
  VID: <Film size={11} strokeWidth={2.3} />,
  PLY: <Headphones size={11} strokeWidth={2.3} />,
  GIT: <FolderGit2 size={11} strokeWidth={2.3} />,
  APP: <AppWindow size={11} strokeWidth={2.3} />,
  PPR: <GraduationCap size={11} strokeWidth={2.3} />,
  DOC: <BookOpen size={11} strokeWidth={2.3} />,
};

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
  // Enhanced Unified Workbench Facet & Filter Props
  bookmarks?: Bookmark[];
  filteredCount?: number;
  collections?: Collection[];
  coll?: string;
  setColl?: (c: string) => void;
  ty?: KindType | null;
  setTy?: (t: KindType | null) => void;
  tag?: string | null;
  setTag?: (t: string | null) => void;
  activeTopicCluster?: string | null;
  setActiveTopicCluster?: (c: string | null) => void;
  unreadOnly?: boolean;
  setUnreadOnly?: (u: boolean) => void;
  neverOpenedOnly?: boolean;
  setNeverOpenedOnly?: (u: boolean) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  guessedCount?: number;
  onResetFilters?: () => void;
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
  bookmarks = [],
  filteredCount,
  collections = [],
  coll = "all",
  setColl,
  ty = null,
  setTy,
  tag = null,
  setTag,
  activeTopicCluster = null,
  setActiveTopicCluster,
  unreadOnly = false,
  setUnreadOnly,
  neverOpenedOnly = false,
  setNeverOpenedOnly,
  sidebarCollapsed = false,
  onToggleSidebar,
  guessedCount = 0,
  onResetFilters,
}) => {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/^https?:\/\//i.test(v.trim())) {
      onOpenCaptureWithUrl(v.trim());
      setQuery("");
      return;
    }
    setQuery(v);
  };

  // Compute active collection name for filter chip
  const activeCollectionName = useMemo(() => {
    if (!coll || coll === "all") return null;
    const flatten = (list: Collection[]): Collection[] => {
      let acc: Collection[] = [];
      list.forEach((c) => {
        acc.push(c);
        if (c.kids) acc = acc.concat(flatten(c.kids));
      });
      return acc;
    };
    const found = flatten(collections).find((c) => c.id === coll);
    return found?.name || coll;
  }, [coll, collections]);

  // Compute Kind counts across active bookmarks
  const kindCounts = useMemo(() => {
    const map: Partial<Record<KindType, number>> = {};
    bookmarks.forEach((b) => {
      if (b.isDeleted || !b.unread) return;
      map[b.ty] = (map[b.ty] || 0) + 1;
    });
    return map;
  }, [bookmarks]);

  const totalActiveCount = useMemo(
    () => bookmarks.filter((b) => !b.isDeleted && b.unread).length,
    [bookmarks]
  );

  const hasAnyFilter =
    coll !== "all" ||
    ty !== null ||
    Boolean(tag) ||
    Boolean(activeTopicCluster) ||
    unreadOnly ||
    neverOpenedOnly ||
    Boolean(query.trim());

  return (
    <div className="lib-workbench-header">
      {/* Row 1: Rail Toggle + Omnibox with Active Filter Chips + Sort Dropdown + View Switcher */}
      <div className="lib-command-row">
        {onToggleSidebar && (
          <button
            type="button"
            className="lib-rail-toggle"
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? "Expand navigation rail" : "Collapse navigation rail"}
            aria-label={sidebarCollapsed ? "Expand navigation rail" : "Collapse navigation rail"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}

        <div className="lib-omnibox" onClick={() => searchInputRef.current?.focus()}>
          <span className="lib-omnibox-icon">
            <Search size={14} strokeWidth={2.5} />
          </span>

          {/* Active Filter Chips inside Omnibox */}
          {activeCollectionName && setColl && (
            <button
              type="button"
              className="lib-filter-chip"
              onClick={(e) => {
                e.stopPropagation();
                setColl("all");
              }}
              title="Clear collection filter"
            >
              <Folder size={11} />
              <span>{activeCollectionName}</span>
              <X size={11} />
            </button>
          )}

          {activeTopicCluster && setActiveTopicCluster && (
            <button
              type="button"
              className="lib-filter-chip"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTopicCluster(null);
              }}
              title="Clear topic cluster filter"
            >
              <Tag size={11} />
              <span>{activeTopicCluster}</span>
              <X size={11} />
            </button>
          )}

          {ty && setTy && (
            <button
              type="button"
              className="lib-filter-chip"
              onClick={(e) => {
                e.stopPropagation();
                setTy(null);
              }}
              title="Clear kind filter"
            >
              <span>{TYPES[ty]?.name || ty}</span>
              <X size={11} />
            </button>
          )}

          {tag && setTag && (
            <button
              type="button"
              className="lib-filter-chip"
              onClick={(e) => {
                e.stopPropagation();
                setTag(null);
              }}
              title="Clear tag filter"
            >
              <span>#{tag}</span>
              <X size={11} />
            </button>
          )}

          {unreadOnly && setUnreadOnly && (
            <button
              type="button"
              className="lib-filter-chip"
              onClick={(e) => {
                e.stopPropagation();
                setUnreadOnly(false);
              }}
              title="Clear unread filter"
            >
              <span>Unread Queue</span>
              <X size={11} />
            </button>
          )}

          {neverOpenedOnly && setNeverOpenedOnly && (
            <button
              type="button"
              className="lib-filter-chip"
              onClick={(e) => {
                e.stopPropagation();
                setNeverOpenedOnly(false);
              }}
              title="Clear never opened filter"
            >
              <span>Never Opened</span>
              <X size={11} />
            </button>
          )}

          <input
            ref={searchInputRef}
            value={query}
            onChange={handleInput}
            placeholder={
              hasAnyFilter
                ? "Refine results or paste URL to save..."
                : "Search titles, domains, notes (is:video #tag) or paste a URL..."
            }
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
              }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "2px 4px",
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search text"
              aria-label="Clear search text"
            >
              <X size={13} />
            </button>
          )}

          <span className="lib-omnibox-kbd" title="Press / to focus search">
            /
          </span>
        </div>

        <div className="lib-controls-group">
          {/* Compact Sort Select */}
          <div className="lib-sort-select-wrap">
            <select
              className="lib-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              aria-label="Sort bookmarks"
            >
              <option value="recent">SORT: RECENTLY SAVED</option>
              <option value="mostUsed">SORT: MOST USED</option>
              <option value="recentlyUsed">SORT: RECENTLY USED</option>
              <option value="az">SORT: A–Z</option>
            </select>
            <ChevronDown size={13} className="lib-sort-caret" />
          </div>

          {/* Segmented View Switcher */}
          <div className="lib-view-seg" role="group" aria-label="View layout">
            <button
              type="button"
              className={`lib-view-btn ${view === "grid" || view === "masonry" ? "on" : ""}`}
              onClick={() => setView("grid")}
              title="Cards Grid View"
            >
              <LayoutGrid size={13} /> <span className="nb-hide-mobile">CARDS</span>
            </button>
            <button
              type="button"
              className={`lib-view-btn ${view === "list" ? "on" : ""}`}
              onClick={() => setView("list")}
              title="Compact List View"
            >
              <List size={13} /> <span className="nb-hide-mobile">LIST</span>
            </button>
            <button
              type="button"
              className={`lib-view-btn ${view === "heads" ? "on" : ""}`}
              onClick={() => setView("heads")}
              title="High-Density Table"
            >
              <Table2 size={13} /> <span className="nb-hide-mobile">TABLE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Horizontal 1-Click Kind Facet Strip + Item Counts + Review Pill */}
      {view !== "archive" && (
        <div className="lib-facet-row">
          <div className="lib-kind-strip" role="tablist" aria-label="Filter by content kind">
            <button
              type="button"
              role="tab"
              aria-selected={ty === null}
              className={`lib-kind-pill ${ty === null ? "on" : ""}`}
              onClick={() => setTy?.(null)}
            >
              <span>ALL KINDS</span>
              <span className="k-cnt">{totalActiveCount}</span>
            </button>

            {(Object.keys(TYPES) as KindType[]).map((k) => {
              const meta = TYPES[k];
              const count = kindCounts[k] || 0;
              const isSelected = ty === k;

              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-kind={k}
                  className={`lib-kind-pill ${isSelected ? "on" : ""} ${count === 0 ? "zero" : ""}`}
                  onClick={() => setTy?.(isSelected ? null : k)}
                >
                  {KIND_ICONS[k]}
                  <span>{meta.name.toUpperCase()}</span>
                  <span className="k-cnt">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="lib-facet-meta">
            {guessedCount > 0 && (
              <Link href="/library/review" className="lib-review-pill">
                <Zap size={11} />
                <span>
                  {guessedCount} AUTO-CLASSIFIED
                </span>
                <span style={{ textDecoration: "underline" }}>REVIEW →</span>
              </Link>
            )}

            {hasAnyFilter && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                style={{
                  border: "1.5px solid var(--ink)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  padding: "3px 8px",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                RESET FILTERS
              </button>
            )}

            {typeof filteredCount === "number" && (
              <span className="lib-count-badge">
                <b>{filteredCount}</b> {filteredCount === 1 ? "ITEM" : "ITEMS"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
