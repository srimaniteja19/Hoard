"use client";

import React, { useMemo, useState, useEffect } from "react";
import { TilItem, TilFeedItem } from "@/components/til/TilFeedItem";
import { TilType } from "@/db/schema";
import {
  parseGotcha,
  parseQuote,
  parseOpinion,
  parsePattern,
  parseNews,
  stripNote,
} from "@/lib/til/entryParser";
import {
  Calendar,
  Search,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Rows3,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  Clock,
  X,
} from "lucide-react";

interface TilFeedProps {
  items: TilItem[];
  nextCursor: string | null;
  onLoadMore: () => void;
  loadingMore: boolean;
  onUpdate: (id: string, updated: Partial<TilItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedTag: string | null;
  selectedType: TilType | null;
  selectedDay: string | null;
  selectedHash?: string | null;
  searchQuery?: string | null;
  onClearTagFilter: () => void;
  onClearTypeFilter: () => void;
  onClearDayFilter: () => void;
  onClearHashFilter?: () => void;
  onClearSearchFilter?: () => void;
  onClearAllFilters?: () => void;
  onSelectTag: (tag: string) => void;
  onSelectType: (type: TilType) => void;
}

type TimeHorizon = "all" | "today" | "week" | "month";
type FeedDisplayMode = "index" | "cards";

interface DayMeta {
  dayStr: string;
  dayNum: string;
  monthShort: string;
  monthYear: string;
  weekdayLong: string;
  weekdayShort: string;
  fullDateLabel: string;
  relativeLabel: string;
  isToday: boolean;
  isYesterday: boolean;
  daysDiff: number;
}

const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseDayMeta(dayStr: string): DayMeta {
  try {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [year, month, day] = dayStr.split("-").map(Number);
    const targetMidnight = new Date(year, month - 1, day);

    const diffMs = todayMidnight.getTime() - targetMidnight.getTime();
    const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const weekdayIdx = targetMidnight.getDay();
    const monthIdx = targetMidnight.getMonth();

    const isToday = daysDiff === 0;
    const isYesterday = daysDiff === 1;

    let relativeLabel = "";
    if (isToday) relativeLabel = "TODAY";
    else if (isYesterday) relativeLabel = "YESTERDAY";
    else if (daysDiff > 1 && daysDiff < 7) relativeLabel = `${daysDiff} DAYS AGO`;
    else if (daysDiff >= 7 && daysDiff < 14) relativeLabel = "LAST WEEK";
    else if (daysDiff >= 14 && daysDiff < 30) relativeLabel = `${Math.floor(daysDiff / 7)}W AGO`;
    else relativeLabel = `${MONTHS_SHORT[monthIdx]} ${year}`;

    return {
      dayStr,
      dayNum: String(day).padStart(2, "0"),
      monthShort: MONTHS_SHORT[monthIdx] || "DAY",
      monthYear: `${(MONTHS_LONG[monthIdx] || "").toUpperCase()} ${year}`,
      weekdayLong: WEEKDAYS_LONG[weekdayIdx] || dayStr,
      weekdayShort: WEEKDAYS_SHORT[weekdayIdx] || "DAY",
      fullDateLabel: `${MONTHS_LONG[monthIdx]} ${day}, ${year}`,
      relativeLabel,
      isToday,
      isYesterday,
      daysDiff,
    };
  } catch {
    return {
      dayStr,
      dayNum: "--",
      monthShort: "DAY",
      monthYear: "ARCHIVE",
      weekdayLong: dayStr,
      weekdayShort: "DAY",
      fullDateLabel: dayStr,
      relativeLabel: dayStr,
      isToday: false,
      isYesterday: false,
      daysDiff: 999,
    };
  }
}

function getItemHeadline(item: TilItem): { title: string; subtitle?: string } {
  const raw = stripNote(item.body) || "";
  switch (item.type) {
    case "GOTCHA": {
      const g = parseGotcha(item.body);
      return {
        title: g.actually || g.thought || "Corrected assumption",
        subtitle: g.thought ? `Thought: ${g.thought}` : undefined,
      };
    }
    case "QUOTE": {
      const q = parseQuote(item.body);
      return {
        title: `“${q.quote}”`,
        subtitle: q.author ? `— ${q.author}${q.source ? ` (${q.source})` : ""}` : undefined,
      };
    }
    case "PATTERN": {
      const p = parsePattern(item.body, item.loggedFor);
      return {
        title: p.name || raw,
        subtitle: p.instances.length > 0 ? `${p.instances.length} recurring instances` : undefined,
      };
    }
    case "OPINION": {
      const op = parseOpinion(item.body, item.createdAt);
      return {
        title: op.take || raw,
        subtitle: `Conviction ${op.conviction}/5`,
      };
    }
    case "NEWS": {
      const nw = parseNews(item.body);
      return {
        title: nw.headline || nw.items[0] || raw,
        subtitle: nw.items.length > 1 ? `${nw.items.length} key developments` : nw.source,
      };
    }
    case "SNIPPET": {
      const firstCodeLine = (item.code || "").split("\n").find((l) => l.trim().length > 0);
      return {
        title: raw || firstCodeLine || "Code snippet",
        subtitle: item.codeLang ? item.codeLang.toUpperCase() : firstCodeLine,
      };
    }
    case "LINK": {
      const host =
        item.linkPreview?.host ||
        (item.linkUrl ? item.linkUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : undefined);
      return {
        title: item.linkPreview?.title || raw || item.linkUrl || "Saved link",
        subtitle: host,
      };
    }
    case "FACT":
    default: {
      const clean = raw
        .replace(/^#+\s*/gm, "")
        .replace(/^\s*[-*•]\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();
      const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        title: lines[0] || "Logged insight",
        subtitle: lines.length > 1 ? `${lines.length - 1} more points` : item.linkPreview?.host,
      };
    }
  }
}

export const TilFeed: React.FC<TilFeedProps> = ({
  items,
  nextCursor,
  onLoadMore,
  loadingMore,
  onUpdate,
  onDelete,
  selectedTag,
  selectedType,
  selectedDay,
  selectedHash,
  searchQuery,
  onClearTagFilter,
  onClearTypeFilter,
  onClearDayFilter,
  onClearHashFilter,
  onClearSearchFilter,
  onClearAllFilters,
  onSelectTag,
  onSelectType,
}) => {
  const [horizon, setHorizon] = useState<TimeHorizon>("all");
  const [isolatedDay, setIsolatedDay] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<FeedDisplayMode>("index");
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
  const [activeScrollDay, setActiveScrollDay] = useState<string | null>(null);

  const validHashes = useMemo(() => {
    return new Set(items.map((i) => i.shortHash.toLowerCase()));
  }, [items]);

  // Enrich and group all items by Day (YYYY-MM-DD)
  const allDayGroups = useMemo(() => {
    const map = new Map<string, TilItem[]>();
    for (const item of items) {
      const day = item.loggedFor || item.createdAt.split("T")[0];
      const list = map.get(day) || [];
      list.push(item);
      map.set(day, list);
    }
    return Array.from(map.entries()).map(([dayStr, dayItems]) => {
      const meta = parseDayMeta(dayStr);
      const typeBreakdown: Partial<Record<TilType, number>> = {};
      for (const it of dayItems) {
        typeBreakdown[it.type] = (typeBreakdown[it.type] || 0) + 1;
      }
      return {
        dayStr,
        meta,
        items: dayItems,
        typeBreakdown,
      };
    });
  }, [items]);

  // Horizon counts
  const horizonCounts = useMemo(() => {
    let today = 0;
    let week = 0;
    let month = 0;
    for (const g of allDayGroups) {
      if (g.meta.daysDiff === 0) today += g.items.length;
      if (g.meta.daysDiff >= 0 && g.meta.daysDiff <= 7) week += g.items.length;
      if (g.meta.daysDiff >= 0 && g.meta.daysDiff <= 30) month += g.items.length;
    }
    return {
      all: items.length,
      today,
      week,
      month,
    };
  }, [allDayGroups, items.length]);

  // Filter day groups by active TimeHorizon and isolatedDay
  const visibleDayGroups = useMemo(() => {
    return allDayGroups.filter((g) => {
      if (isolatedDay && g.dayStr !== isolatedDay) return false;
      if (horizon === "today") return g.meta.daysDiff === 0;
      if (horizon === "week") return g.meta.daysDiff >= 0 && g.meta.daysDiff <= 7;
      if (horizon === "month") return g.meta.daysDiff >= 0 && g.meta.daysDiff <= 30;
      return true;
    });
  }, [allDayGroups, horizon, isolatedDay]);

  // Group sidebar dates by Month-Year for clean hierarchical navigation
  const monthBuckets = useMemo(() => {
    const map = new Map<string, typeof allDayGroups>();
    for (const g of allDayGroups) {
      const list = map.get(g.meta.monthYear) || [];
      list.push(g);
      map.set(g.meta.monthYear, list);
    }
    return Array.from(map.entries());
  }, [allDayGroups]);

  // Scroll-spy for active day in the left sidebar
  useEffect(() => {
    if (visibleDayGroups.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const day = entry.target.getAttribute("data-day");
            if (day) setActiveScrollDay(day);
            break;
          }
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0.05 }
    );

    const sections = document.querySelectorAll(".til-day-folio[data-day]");
    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [visibleDayGroups]);

  const toggleDayCollapse = (dayStr: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayStr)) next.delete(dayStr);
      else next.add(dayStr);
      return next;
    });
  };

  const toggleItemExpand = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleJumpToDay = (dayStr: string) => {
    // Ensure day is unfolded
    setCollapsedDays((prev) => {
      if (!prev.has(dayStr)) return prev;
      const next = new Set(prev);
      next.delete(dayStr);
      return next;
    });
    setActiveScrollDay(dayStr);
    const el = document.getElementById(`til-day-${dayStr}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const allDaysCollapsed =
    visibleDayGroups.length > 0 &&
    visibleDayGroups.every((g) => collapsedDays.has(g.dayStr));

  const handleToggleAllDays = () => {
    if (allDaysCollapsed) {
      setCollapsedDays(new Set());
    } else {
      setCollapsedDays(new Set(visibleDayGroups.map((g) => g.dayStr)));
    }
  };

  const hasActiveFilters = Boolean(
    selectedTag ||
      selectedType ||
      selectedDay ||
      selectedHash ||
      (searchQuery && searchQuery.trim())
  );

  const totalVisibleItems = useMemo(
    () => visibleDayGroups.reduce((acc, g) => acc + g.items.length, 0),
    [visibleDayGroups]
  );

  if (items.length === 0) {
    return (
      <div className="til-feed-empty-state">
        <div className="empty-state-icon">
          <Search size={28} strokeWidth={2.5} />
        </div>

        <h3 className="empty-state-title">
          {hasActiveFilters ? "No Matching Specimens Located" : "Epistemic Ledger Is Empty"}
        </h3>

        <p className="empty-state-desc">
          {hasActiveFilters
            ? "No filed insights match your active query or archetype filter."
            : "Click the '+ LOG TODAY'S TIL' bar above (or press N) to record your first insight."}
        </p>

        {hasActiveFilters && (
          <div className="empty-state-active-summary">
            {searchQuery && (
              <div className="summary-item">
                <span className="k">QUERY:</span>
                <span className="v">&ldquo;{searchQuery}&rdquo;</span>
              </div>
            )}
            {selectedType && (
              <div className="summary-item">
                <span className="k">CATEGORY:</span>
                <span className="v">{selectedType}</span>
              </div>
            )}
            {selectedTag && (
              <div className="summary-item">
                <span className="k">TAG:</span>
                <span className="v">#{selectedTag}</span>
              </div>
            )}
            {selectedDay && (
              <div className="summary-item">
                <span className="k">DATE:</span>
                <span className="v">{selectedDay}</span>
              </div>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <div className="empty-state-actions">
            {onClearAllFilters && (
              <button
                type="button"
                onClick={onClearAllFilters}
                className="empty-action-btn primary"
              >
                RESET ALL FILTERS
              </button>
            )}
            {searchQuery && onClearSearchFilter && (
              <button
                type="button"
                onClick={onClearSearchFilter}
                className="empty-action-btn"
              >
                CLEAR SEARCH
              </button>
            )}
            {selectedType && (
              <button
                type="button"
                onClick={onClearTypeFilter}
                className="empty-action-btn"
              >
                ALL CATEGORIES
              </button>
            )}
            {selectedDay && (
              <button
                type="button"
                onClick={onClearDayFilter}
                className="empty-action-btn"
              >
                CLEAR DATE
              </button>
            )}
            {selectedTag && (
              <button
                type="button"
                onClick={onClearTagFilter}
                className="empty-action-btn"
              >
                CLEAR TAG
              </button>
            )}
            {selectedHash && onClearHashFilter && (
              <button
                type="button"
                onClick={onClearHashFilter}
                className="empty-action-btn"
              >
                CLEAR SPECIMEN
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="til-chronicle">
      {/* ─── LEFT STICKY COLUMN: DAY & DATE INDEX NAVIGATOR ──────────────── */}
      <aside className="til-date-sidebar" aria-label="Navigate TILs by Day and Date">
        <div className="til-date-sidebar__inner">
          <div className="til-date-sidebar__head">
            <span className="til-date-sidebar__title">
              <Calendar size={13} strokeWidth={2.5} />
              <span>DATE CHRONICLE</span>
            </span>
            <span className="til-date-sidebar__total">
              {allDayGroups.length} {allDayGroups.length === 1 ? "DAY" : "DAYS"}
            </span>
          </div>

          {/* Time Horizon Quick Filters */}
          <div className="til-horizon-tabs" role="tablist" aria-label="Filter by time period">
            <button
              type="button"
              role="tab"
              aria-selected={horizon === "all" && !isolatedDay}
              className={`til-horizon-btn ${horizon === "all" && !isolatedDay ? "on" : ""}`}
              onClick={() => {
                setHorizon("all");
                setIsolatedDay(null);
              }}
            >
              <span>ALL</span>
              <b>{horizonCounts.all}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={horizon === "today" && !isolatedDay}
              className={`til-horizon-btn ${horizon === "today" && !isolatedDay ? "on" : ""}`}
              onClick={() => {
                setHorizon("today");
                setIsolatedDay(null);
              }}
            >
              <span>TODAY</span>
              <b>{horizonCounts.today}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={horizon === "week" && !isolatedDay}
              className={`til-horizon-btn ${horizon === "week" && !isolatedDay ? "on" : ""}`}
              onClick={() => {
                setHorizon("week");
                setIsolatedDay(null);
              }}
            >
              <span>7D</span>
              <b>{horizonCounts.week}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={horizon === "month" && !isolatedDay}
              className={`til-horizon-btn ${horizon === "month" && !isolatedDay ? "on" : ""}`}
              onClick={() => {
                setHorizon("month");
                setIsolatedDay(null);
              }}
            >
              <span>30D</span>
              <b>{horizonCounts.month}</b>
            </button>
          </div>

          {isolatedDay && (
            <div className="til-date-isolated-banner">
              <span>ISOLATED: {isolatedDay}</span>
              <button
                type="button"
                onClick={() => setIsolatedDay(null)}
                title="Show all dates"
              >
                <X size={11} strokeWidth={3} />
              </button>
            </div>
          )}

          {/* Hierarchical Month -> Day & Date Directory */}
          <div className="til-date-tree">
            {monthBuckets.map(([monthYear, monthDays]) => {
              const monthTotal = monthDays.reduce((s, d) => s + d.items.length, 0);
              return (
                <div key={monthYear} className="til-month-group">
                  <div className="til-month-group__head">
                    <span>{monthYear}</span>
                    <b>{monthTotal}</b>
                  </div>

                  <div className="til-month-group__days">
                    {monthDays.map((g) => {
                      const isCurrent =
                        isolatedDay === g.dayStr ||
                        (!isolatedDay && (activeScrollDay || allDayGroups[0]?.dayStr) === g.dayStr);
                      const firstHeadline = getItemHeadline(g.items[0]);

                      return (
                        <div
                          key={g.dayStr}
                          className={`til-date-nav-item ${isCurrent ? "is-active" : ""} ${
                            g.meta.isToday ? "is-today" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="til-date-nav-item__main"
                            onClick={() => {
                              if (isolatedDay && isolatedDay !== g.dayStr) {
                                setIsolatedDay(g.dayStr);
                              } else {
                                handleJumpToDay(g.dayStr);
                              }
                            }}
                            title={`Jump to ${g.meta.weekdayLong}, ${g.meta.fullDateLabel} (${g.items.length} saved)`}
                          >
                            <div className="til-date-nav-cal">
                              <span className="til-date-nav-cal__dow">{g.meta.weekdayShort}</span>
                              <b className="til-date-nav-cal__num">{g.meta.dayNum}</b>
                            </div>

                            <div className="til-date-nav-info">
                              <div className="til-date-nav-info__top">
                                <span className="til-date-nav-info__label">
                                  {g.meta.isToday
                                    ? "Today"
                                    : g.meta.isYesterday
                                    ? "Yesterday"
                                    : `${g.meta.weekdayLong.slice(0, 3)}, ${g.meta.monthShort} ${g.meta.dayNum}`}
                                </span>
                                <span className="til-date-nav-info__count">{g.items.length}</span>
                              </div>
                              <div className="til-date-nav-info__preview">
                                {firstHeadline.title}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            className={`til-date-nav-isolate ${isolatedDay === g.dayStr ? "on" : ""}`}
                            onClick={() =>
                              setIsolatedDay((prev) => (prev === g.dayStr ? null : g.dayStr))
                            }
                            title={
                              isolatedDay === g.dayStr
                                ? "Show all dates"
                                : `Show only ${g.meta.fullDateLabel}`
                            }
                          >
                            {isolatedDay === g.dayStr ? "ALL" : "ONLY"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ─── RIGHT MAIN COLUMN: DAY FOLIOS & SAVED CONTENT ───────────────── */}
      <div className="til-chronicle-main">
        {/* Chronicle Control Bar */}
        <div className="til-chronicle-toolbar">
          <div className="til-chronicle-toolbar__left">
            <span className="til-chronicle-scope">
              <b>{totalVisibleItems}</b> SAVED ACROSS <b>{visibleDayGroups.length}</b>{" "}
              {visibleDayGroups.length === 1 ? "DAY" : "DAYS"}
            </span>
            {horizon !== "all" && (
              <button
                type="button"
                className="til-chronicle-filter-pill"
                onClick={() => setHorizon("all")}
              >
                <Clock size={11} />
                <span>WINDOW: {horizon.toUpperCase()}</span>
                <X size={11} />
              </button>
            )}
            {isolatedDay && (
              <button
                type="button"
                className="til-chronicle-filter-pill"
                onClick={() => setIsolatedDay(null)}
              >
                <Calendar size={11} />
                <span>DATE: {isolatedDay}</span>
                <X size={11} />
              </button>
            )}
          </div>

          <div className="til-chronicle-toolbar__right">
            <button
              type="button"
              className="til-fold-days-btn"
              onClick={handleToggleAllDays}
              title={allDaysCollapsed ? "Expand all days" : "Collapse all days into date headers"}
            >
              {allDaysCollapsed ? (
                <>
                  <ChevronsUpDown size={13} strokeWidth={2.4} />
                  <span>EXPAND DAYS</span>
                </>
              ) : (
                <>
                  <ChevronsDownUp size={13} strokeWidth={2.4} />
                  <span>FOLD DAYS</span>
                </>
              )}
            </button>

            <div className="til-density-switch" role="group" aria-label="Content display mode">
              <button
                type="button"
                className={`til-density-btn ${displayMode === "index" ? "on" : ""}`}
                onClick={() => setDisplayMode("index")}
                title="Scannable Index by Date — click any item to expand full card"
              >
                <LayoutList size={13} strokeWidth={2.4} />
                <span>INDEX BY DATE</span>
              </button>
              <button
                type="button"
                className={`til-density-btn ${displayMode === "cards" ? "on" : ""}`}
                onClick={() => setDisplayMode("cards")}
                title="Full Cards by Date"
              >
                <Rows3 size={13} strokeWidth={2.4} />
                <span>FULL CARDS</span>
              </button>
            </div>
          </div>
        </div>

        {/* If horizon filter has 0 results */}
        {visibleDayGroups.length === 0 ? (
          <div className="til-feed-empty-state">
            <h3 className="empty-state-title">No Entries in Selected Time Window</h3>
            <p className="empty-state-desc">
              No TIL entries were logged in this date range. Switch back to All Dates to browse your full chronicle.
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="empty-action-btn primary"
                onClick={() => {
                  setHorizon("all");
                  setIsolatedDay(null);
                }}
              >
                SHOW ALL DATES ({items.length})
              </button>
            </div>
          </div>
        ) : (
          <div className="til-day-folios-list">
            {visibleDayGroups.map((group) => {
              const { dayStr, meta, items: dayItems, typeBreakdown } = group;
              const isDayCollapsed = collapsedDays.has(dayStr);
              const allItemsInDayExpanded =
                displayMode === "cards" ||
                dayItems.every((it) => expandedItemIds.has(it.id));

              return (
                <section
                  key={dayStr}
                  id={`til-day-${dayStr}`}
                  data-day={dayStr}
                  className={`til-day-folio ${meta.isToday ? "is-today" : ""} ${
                    isDayCollapsed ? "is-collapsed" : ""
                  }`}
                  aria-label={`${meta.weekdayLong}, ${meta.fullDateLabel}`}
                >
                  {/* ─── DAY & DATE FOLIO HEADER ──────────────────────────── */}
                  <header className="til-day-folio__head">
                    <button
                      type="button"
                      className="til-day-folio__toggle"
                      onClick={() => toggleDayCollapse(dayStr)}
                      aria-expanded={!isDayCollapsed}
                    >
                      {/* Tear-Off Calendar Leaf */}
                      <div className="til-cal-leaf">
                        <span className="til-cal-leaf__month">{meta.monthShort}</span>
                        <b className="til-cal-leaf__day">{meta.dayNum}</b>
                      </div>

                      {/* Day of Week & Full Date */}
                      <div className="til-day-title-block">
                        <div className="til-day-title-row">
                          <h2 className="til-day-weekday">{meta.weekdayLong}</h2>
                          <span
                            className={`til-day-rel-badge ${
                              meta.isToday
                                ? "is-today"
                                : meta.isYesterday
                                ? "is-yesterday"
                                : ""
                            }`}
                          >
                            {meta.relativeLabel}
                          </span>
                        </div>
                        <span className="til-day-fulldate">{meta.fullDateLabel}</span>
                      </div>
                    </button>

                    {/* Day Category Breakdown Pills & Controls */}
                    <div className="til-day-folio__meta">
                      <div className="til-day-type-chips">
                        {(Object.entries(typeBreakdown) as Array<[TilType, number]>).map(
                          ([t, count]) => (
                            <button
                              key={t}
                              type="button"
                              className={`til-day-type-chip til-day-type-chip--${t.toLowerCase()}`}
                              onClick={() => onSelectType(t)}
                              title={`Filter by ${t}`}
                            >
                              <b>{count}</b> {t}
                            </button>
                          )
                        )}
                      </div>

                      {!isDayCollapsed && displayMode === "index" && dayItems.length > 1 && (
                        <button
                          type="button"
                          className="til-day-expand-all-btn"
                          onClick={() => {
                            setExpandedItemIds((prev) => {
                              const next = new Set(prev);
                              if (allItemsInDayExpanded) {
                                dayItems.forEach((it) => next.delete(it.id));
                              } else {
                                dayItems.forEach((it) => next.add(it.id));
                              }
                              return next;
                            });
                          }}
                        >
                          {allItemsInDayExpanded ? "Collapse Items" : "Expand All"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="til-day-collapse-btn"
                        onClick={() => toggleDayCollapse(dayStr)}
                        aria-label={isDayCollapsed ? "Expand day" : "Collapse day"}
                      >
                        <span>
                          {dayItems.length} {dayItems.length === 1 ? "ITEM" : "ITEMS"}
                        </span>
                        {isDayCollapsed ? (
                          <ChevronRight size={14} strokeWidth={2.6} />
                        ) : (
                          <ChevronDown size={14} strokeWidth={2.6} />
                        )}
                      </button>
                    </div>
                  </header>

                  {/* ─── DAY FOLIO CONTENT ────────────────────────────────── */}
                  {!isDayCollapsed && (
                    <div className="til-day-folio__body">
                      {displayMode === "index" ? (
                        /* SCANNABLE INDEX MODE: Crisp rows categorized under this Day, click to expand full card */
                        <div className="til-day-index-list">
                          {dayItems.map((item, idx) => {
                            const isExpanded = expandedItemIds.has(item.id);
                            const headline = getItemHeadline(item);
                            const targetUrl = item.linkUrl || item.linkPreview?.url;

                            return (
                              <div
                                key={item.id}
                                className={`til-index-entry ${isExpanded ? "is-expanded" : ""}`}
                              >
                                <div
                                  className="til-index-row"
                                  role="button"
                                  tabIndex={0}
                                  aria-expanded={isExpanded}
                                  onClick={() => toggleItemExpand(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleItemExpand(item.id);
                                    }
                                  }}
                                >
                                  <span className="til-index-row__num">
                                    {String(idx + 1).padStart(2, "0")}
                                  </span>

                                  <span
                                    className={`til-index-row__type til-index-row__type--${item.type.toLowerCase()}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectType(item.type);
                                    }}
                                  >
                                    {item.type}
                                  </span>

                                  <div className="til-index-row__text">
                                    <span className="til-index-row__title">{headline.title}</span>
                                    {headline.subtitle && (
                                      <span className="til-index-row__sub">
                                        {headline.subtitle}
                                      </span>
                                    )}
                                  </div>

                                  {item.tags && item.tags.length > 0 && (
                                    <div
                                      className="til-index-row__tags"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {item.tags.slice(0, 3).map((tag) => (
                                        <button
                                          key={tag}
                                          type="button"
                                          className="til-index-tag"
                                          onClick={() => onSelectTag(tag)}
                                        >
                                          #{tag}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {targetUrl && (
                                    <a
                                      href={targetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="til-index-row__ext"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Open source URL"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  )}

                                  <span className="til-index-row__chev" aria-hidden="true">
                                    {isExpanded ? (
                                      <ChevronDown size={15} strokeWidth={2.5} />
                                    ) : (
                                      <ChevronRight size={15} strokeWidth={2.5} />
                                    )}
                                  </span>
                                </div>

                                {isExpanded && (
                                  <div className="til-index-entry__card">
                                    <TilFeedItem
                                      item={item}
                                      onUpdate={onUpdate}
                                      onDelete={onDelete}
                                      onSelectTag={onSelectTag}
                                      onSelectType={onSelectType}
                                      validHashes={validHashes}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* FULL CARDS MODE: With Day Quick-Jump Table of Contents when >= 2 items */
                        <div className="til-day-cards-stack">
                          {dayItems.length > 1 && (
                            <nav
                              className="til-day-toc"
                              aria-label={`Table of contents for ${meta.fullDateLabel}`}
                            >
                              <span className="til-day-toc__label">IN THIS DAY:</span>
                              <div className="til-day-toc__items">
                                {dayItems.map((item, idx) => {
                                  const headline = getItemHeadline(item);
                                  return (
                                    <a
                                      key={item.id}
                                      href={`#til-${item.shortHash}`}
                                      className="til-day-toc__pill"
                                    >
                                      <b>{String(idx + 1).padStart(2, "0")}</b>
                                      <span className="til-day-toc__type">{item.type}</span>
                                      <span className="til-day-toc__text">{headline.title}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            </nav>
                          )}

                          <div className="til-day-entries">
                            {dayItems.map((item) => (
                              <TilFeedItem
                                key={item.id}
                                item={item}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onSelectTag={onSelectTag}
                                onSelectType={onSelectType}
                                validHashes={validHashes}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {nextCursor && (
          <div className="til-load-more-wrap">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="til-load-more-btn"
            >
              {loadingMore ? "FETCHING OLDER DATES..." : "LOAD OLDER DAYS & DATES"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
