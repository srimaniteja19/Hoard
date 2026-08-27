"use client";

import React, { useMemo } from "react";
import { StreakData, HeatmapData } from "@/lib/dal/til";
import { Flame, ShieldAlert, Sparkles, Calendar } from "lucide-react";

interface TilHeaderSummaryProps {
  streak: StreakData;
  heatmap: HeatmapData;
  totalCount: number;
  onSelectDay?: (day: string | null) => void;
  selectedDay?: string | null;
}

export const TilHeaderSummary: React.FC<TilHeaderSummaryProps> = ({
  streak,
  heatmap,
  totalCount,
  onSelectDay,
  selectedDay,
}) => {
  // Generate 26 weeks (182 days) ending today for the dense 7px strip
  const stripCells = useMemo(() => {
    const today = new Date();
    const cells: { dateStr: string; count: number; cssClass: string }[] = [];

    for (let i = 181; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${dayNum}`;
      const count = heatmap[dateStr] || 0;

      let cssClass = "";
      if (count > 3) cssClass = "c";
      else if (count > 1) cssClass = "b";
      else if (count > 0) cssClass = "a";

      cells.push({ dateStr, count, cssClass });
    }

    return cells;
  }, [heatmap]);

  const skipsLeft = Math.max(0, 2 - streak.skipsUsedThisMonth);
  const needsTending = streak.needsTendingCount ?? 0;
  const totalFiled = streak.totalCount ?? totalCount;

  return (
    <div className="top">
      <div>
        <h1>Today I Learned</h1>
        <div className="facts">
          <span className="fact-streak-pill">
            <Flame size={13} className={streak.currentStreak > 0 ? "text-amber-500 fill-amber-500" : ""} />
            STREAK <b>{streak.currentStreak}</b> {streak.currentStreak === 1 ? "DAY" : "DAYS"}
          </span>
          <span>
            SKIPS LEFT <b>{skipsLeft}</b> OF 2
          </span>
          <span className={needsTending > 0 ? "warn" : ""}>
            {needsTending > 0 && <ShieldAlert size={12} style={{ marginRight: 3 }} />}
            NEEDS TENDING <b>{needsTending}</b>
          </span>
          <span>
            FILED <b>{totalFiled}</b> ALL TIME
          </span>
        </div>
      </div>

      <div
        className="strip"
        title="26-Week Dense Activity Strip (Click any day to filter)"
        style={{ cursor: onSelectDay ? "pointer" : "default" }}
      >
        {stripCells.map((cell, idx) => {
          const isSelected = selectedDay === cell.dateStr;
          return (
            <i
              key={idx}
              className={cell.cssClass}
              onClick={() => onSelectDay && onSelectDay(isSelected ? null : cell.dateStr)}
              style={isSelected ? { outline: "2px solid var(--pink, #FF007A)", zIndex: 2, transform: "scale(1.3)" } : {}}
              title={`${cell.dateStr}: ${cell.count} ${cell.count === 1 ? "entry" : "entries"}`}
            />
          );
        })}
        <span className="strip__lab">
          26 WEEKS · {streak.currentStreak}-DAY STREAK · LONGEST {streak.longestStreak}
        </span>
      </div>
    </div>
  );
};

