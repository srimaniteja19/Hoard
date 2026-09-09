"use client";

import React, { useMemo } from "react";
import { TilItem, TilFeedItem } from "@/components/til/TilFeedItem";
import { TilType } from "@/db/schema";
import { Calendar, Filter, X, Search } from "lucide-react";

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
  // Group feed items by loggedFor date
  const groupedByDay = useMemo(() => {
    const map = new Map<string, TilItem[]>();
    for (const item of items) {
      const day = item.loggedFor || item.createdAt.split("T")[0];
      const list = map.get(day) || [];
      list.push(item);
      map.set(day, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const validHashes = useMemo(() => {
    return new Set(items.map((i) => i.shortHash.toLowerCase()));
  }, [items]);

  const hasActiveFilters = Boolean(
    selectedTag || selectedType || selectedDay || selectedHash || (searchQuery && searchQuery.trim())
  );

  const formatDayHeader = (dayStr: string) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const [year, month, day] = dayStr.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const monthDay = `${months[d.getMonth()]} ${d.getDate()}`;

      if (dayStr === todayStr) {
        return `TODAY · ${monthDay}`;
      } else if (dayStr === yesterdayStr) {
        return `YESTERDAY · ${monthDay}`;
      }
      return `${monthDay} · ${year}`;
    } catch {
      return dayStr;
    }
  };

  return (
    <div>
      {/* Empty State */}
      {items.length === 0 ? (
        <div className="til-feed-empty-state">
          <div className="empty-state-badge">
            <span className="dot-red" />
            <span>VAULT_QUERY // 0_RESULTS</span>
          </div>

          <div className="empty-state-icon">
            <Search size={32} strokeWidth={2.5} />
          </div>

          <h3 className="empty-state-title">
            {hasActiveFilters ? "NO MATCHING INSIGHTS LOCATED" : "KNOWLEDGE VAULT IS EMPTY"}
          </h3>

          <p className="empty-state-desc">
            {hasActiveFilters
              ? "We couldn't find any entries matching your current search parameters or category filter."
              : "Start recording your engineering learnings, patterns, quotes, and gotchas with the composer above!"}
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
            </div>
          )}
        </div>
      ) : (
        /* Timeline Feed with left spine */
        <div style={{ position: "relative" }}>
          {groupedByDay.map(([dayStr, dayItems]) => (
            <div key={dayStr} style={{ marginBottom: "28px", position: "relative" }}>
              {/* Day Spine Divider */}
              <div className="day">
                <b>{formatDayHeader(dayStr)}</b>
                <span />
              </div>

              {/* Entries for this Day */}
              <div>
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
          ))}

          {/* Load More Button */}
          {nextCursor && (
            <div style={{ textAlign: "center", marginTop: "24px", marginBottom: "32px" }}>
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  fontWeight: 900,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "var(--bd)",
                  padding: "8px 24px",
                  cursor: loadingMore ? "wait" : "pointer",
                  boxShadow: "var(--sh)",
                }}
              >
                {loadingMore ? "LOADING..." : "LOAD MORE ENTRIES"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
