"use client";

import React, { useMemo } from "react";
import { TilItem, TilFeedItem } from "@/components/til/TilFeedItem";
import { TilType } from "@/db/schema";
import { Calendar, Filter, X } from "lucide-react";

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
  onClearTagFilter: () => void;
  onClearTypeFilter: () => void;
  onClearDayFilter: () => void;
  onClearHashFilter?: () => void;
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
  onClearTagFilter,
  onClearTypeFilter,
  onClearDayFilter,
  onClearHashFilter,
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

  const hasActiveFilters = Boolean(selectedTag || selectedType || selectedDay || selectedHash);

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
      {/* Active Filter Bar */}
      {hasActiveFilters && (
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            padding: "8px 12px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={12} /> ACTIVE FILTERS:
          </span>

          {selectedHash && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                background: "var(--pink, #FF007A)",
                color: "#FFF",
                border: "1px solid var(--ink)",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              HASH: #{selectedHash}
              {onClearHashFilter && (
                <button
                  type="button"
                  className="filter-clear-btn"
                  aria-label="Clear hash filter"
                  onClick={onClearHashFilter}
                  style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", display: "inline-flex", padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </span>
          )}

          {selectedDay && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                background: "#FFE600",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              DAY: {selectedDay}
              <button type="button" className="filter-clear-btn" aria-label="Clear day filter" onClick={onClearDayFilter}>
                <X size={14} />
              </button>
            </span>
          )}

          {selectedType && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                background: "#00F0FF",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              TYPE: {selectedType}
              <button type="button" className="filter-clear-btn" aria-label="Clear type filter" onClick={onClearTypeFilter}>
                <X size={14} />
              </button>
            </span>
          )}

          {selectedTag && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                background: "var(--ink)",
                color: "var(--cream)",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              TAG: #{selectedTag}
              <button type="button" className="filter-clear-btn" aria-label="Clear tag filter" onClick={onClearTagFilter}>
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            padding: "32px 16px",
            textAlign: "center",
            fontFamily: "var(--mono)",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>💡</div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--ink)", marginBottom: "4px" }}>
            No TIL entries found
          </div>
          <div style={{ fontSize: "12px", opacity: 0.7, color: "var(--ink)" }}>
            {hasActiveFilters ? "Try clearing your filters or create a new entry above." : "Use the composer above to log your first TIL entry!"}
          </div>
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
