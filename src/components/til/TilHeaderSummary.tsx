"use client";

import React, { useMemo, useState } from "react";
import { StreakData, HeatmapData } from "@/lib/dal/til";
import { Flame, X } from "lucide-react";

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
  const [hoveredCell, setHoveredCell] = useState<{ dateStr: string; count: number } | null>(null);

  // Generate 26 weeks (182 days) ending today for the dense 26x7 matrix
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
  const totalFiled = streak.totalCount ?? totalCount;
  const activeDaysCount = useMemo(
    () => stripCells.filter((c) => c.count > 0).length,
    [stripCells]
  );

  return (
    <header className="top til-masthead">
      <div className="til-masthead__main">
        <div className="til-masthead__title-group">
          <h1>Today I Learned</h1>
          <p className="til-masthead__deck">
            Personal chronicle of what you learned today — organized cleanly by day and date.
          </p>
        </div>

        <div className="facts" role="region" aria-label="Daily Learning Summary">
          <div className={`fact-pill fact-streak ${streak.currentStreak > 0 ? "is-hot" : ""}`}>
            <Flame size={13} strokeWidth={2.4} className={streak.currentStreak > 0 ? "fact-flame active" : "fact-flame"} />
            <b className="fact-val">{streak.currentStreak}d</b>
            <span className="fact-label">STREAK</span>
          </div>

          <div className="fact-pill">
            <b className="fact-val">{totalFiled}</b>
            <span className="fact-label">SAVED</span>
          </div>

          <div className="fact-pill">
            <b className="fact-val">{activeDaysCount}</b>
            <span className="fact-label">ACTIVE DAYS</span>
          </div>

          <div className="fact-pill">
            <b className="fact-val">{skipsLeft}/2</b>
            <span className="fact-label">SKIPS</span>
          </div>
        </div>
      </div>

      <div className="til-cadence-box">
        <div className="til-cadence-box__head">
          <span className="til-cadence-box__title">26-WEEK ACTIVITY MAP</span>
          {selectedDay ? (
            <button
              type="button"
              className="til-cadence-box__clear"
              onClick={() => onSelectDay && onSelectDay(null)}
              title="Clear date filter"
            >
              <span>DATE: {selectedDay}</span>
              <X size={11} strokeWidth={2.8} />
            </button>
          ) : (
            <span className="til-cadence-box__readout">
              {hoveredCell
                ? `${hoveredCell.dateStr} · ${hoveredCell.count} saved`
                : `${activeDaysCount} active days · click cell to filter`}
            </span>
          )}
        </div>

        <div
          className="strip"
          title="26-Week Cadence Matrix (Click any day to filter stream)"
          style={{ cursor: onSelectDay ? "pointer" : "default" }}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {stripCells.map((cell, idx) => {
            const isSelected = selectedDay === cell.dateStr;
            return (
              <i
                key={idx}
                className={`${cell.cssClass} ${isSelected ? "is-selected" : ""}`.trim()}
                onClick={() => onSelectDay && onSelectDay(isSelected ? null : cell.dateStr)}
                onMouseEnter={() => setHoveredCell({ dateStr: cell.dateStr, count: cell.count })}
                title={`${cell.dateStr}: ${cell.count} ${cell.count === 1 ? "entry" : "entries"}`}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
};


