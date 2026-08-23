"use client";

import React, { useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { ScratchCard } from "./ScratchCard";
import { formatScrapDayHeader } from "@/lib/scratch/parse";

interface ScratchFeedProps {
  scraps: ScrapRow[];
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onPromoteTodo: (id: string) => Promise<void> | void;
  onWeld: (id: string) => void;
  onBury: (id: string) => Promise<void> | void;
}

export const ScratchFeed: React.FC<ScratchFeedProps> = ({
  scraps,
  hasActiveFilters = false,
  onResetFilters,
  onUpdateNotes,
  onPromoteTil,
  onPromoteTodo,
  onWeld,
  onBury,
}) => {
  // Group scraps by loggedFor day
  const groupedByDay = useMemo(() => {
    const groups: Array<{
      dayHeader: string;
      dayKey: string;
      items: ScrapRow[];
      notesCount: number;
    }> = [];

    const dayMap = new Map<string, ScrapRow[]>();

    for (const scrap of scraps) {
      const key = scrap.loggedFor;
      if (!dayMap.has(key)) {
        dayMap.set(key, []);
      }
      dayMap.get(key)!.push(scrap);
    }

    for (const [dayKey, items] of dayMap.entries()) {
      const dayHeader = formatScrapDayHeader(dayKey);
      const notesCount = items.filter((x) => x.notes && x.notes.trim().length > 0).length;
      groups.push({ dayHeader, dayKey, items, notesCount });
    }

    return groups;
  }, [scraps]);

  if (scraps.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="scratch-empty-state">
          <div className="scratch-empty-icon">🔍</div>
          <div className="scratch-empty-title">NO SCRAPS MATCH YOUR CURRENT FILTERS</div>
          <div className="scratch-empty-desc">
            Try adjusting your search query, category tabs, tag, or calendar date.
          </div>
          {onResetFilters && (
            <button
              type="button"
              className="scratch-empty-reset-btn"
              onClick={onResetFilters}
            >
              CLEAR ALL FILTERS ✕
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="scratch-empty-state">
        <div className="scratch-empty-icon">✍️</div>
        <div className="scratch-empty-title">SCRATCHPAD IS EMPTY</div>
        <div className="scratch-empty-desc">
          Type an idea, quote, question, or paste a screenshot in The Slab above to begin!
        </div>
      </div>
    );
  }

  return (
    <div id="stream">
      {groupedByDay.map((group, gIdx) => (
        <div key={group.dayKey}>
          <div className="day-divider">
            <b>{group.dayHeader}</b>
            <span />
            <i>
              {group.items.length} SCRAP{group.items.length === 1 ? "" : "S"}
              {group.notesCount > 0 ? ` · ${group.notesCount} WITH NOTES` : ""}
            </i>
          </div>

          {group.items.map((scrap) => (
            <ScratchCard
              key={scrap.id}
              scrap={scrap}
              isOpenDefault={false}
              onUpdateNotes={onUpdateNotes}
              onPromoteTil={onPromoteTil}
              onPromoteTodo={onPromoteTodo}
              onWeld={onWeld}
              onBury={onBury}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
