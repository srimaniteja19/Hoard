"use client";

import React, { useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { ScratchCard } from "./ScratchCard";
import { formatScrapDayHeader } from "@/lib/scratch/parse";

interface ScratchFeedProps {
  scraps: ScrapRow[];
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onPromoteTodo: (id: string) => Promise<void> | void;
  onWeld: (id: string) => void;
  onBury: (id: string) => Promise<void> | void;
}

export const ScratchFeed: React.FC<ScratchFeedProps> = ({
  scraps,
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
    return (
      <div
        style={{
          border: "var(--b) solid var(--ink)",
          background: "var(--card)",
          padding: "48px 24px",
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: "13px",
          fontWeight: 700,
          boxShadow: "6px 6px 0 var(--ink)",
        }}
      >
        NO SCRAPS YET — START TYPING IN THE SLAB ABOVE!
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

          {group.items.map((scrap, sIdx) => (
            <ScratchCard
              key={scrap.id}
              scrap={scrap}
              isOpenDefault={gIdx === 0 && sIdx === 0 && !!scrap.notes}
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
