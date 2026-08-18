"use client";

import React, { useMemo } from "react";
import { HeatmapData } from "@/lib/dal/til";

interface TilHeatmapProps {
  heatmap: HeatmapData;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

export const TilHeatmap: React.FC<TilHeatmapProps> = ({
  heatmap,
  selectedDay,
  onSelectDay,
}) => {
  // Generate 26 weeks (182 days) ending today
  const weeks = useMemo(() => {
    const today = new Date();
    const days: { dateStr: string; dayOfWeek: number; count: number }[] = [];

    for (let i = 181; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${dayNum}`;

      days.push({
        dateStr,
        dayOfWeek: d.getDay(), // 0 = Sun, 1 = Mon...
        count: heatmap[dateStr] || 0,
      });
    }

    // Chunk into weeks of 7
    const result: typeof days[] = [];
    let currentWeek: typeof days = [];

    days.forEach((dayObj) => {
      currentWeek.push(dayObj);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [heatmap]);

  const getCellColor = (count: number, isSelected: boolean) => {
    if (isSelected) return "#FFE600";
    if (count === 0) return "rgba(0,0,0,0.05)";
    if (count === 1) return "#B6FF3C";
    if (count <= 3) return "#00F0FF";
    return "#FF007A";
  };

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh-sm)",
        padding: "14px 16px",
        marginBottom: "20px",
        overflowX: "auto",
      }}
    >
      <div className="til-heatmap-head">
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 900,
            color: "var(--ink)",
          }}
        >
          26-WEEK LEARNING HEATMAP
        </span>

        <div className="til-heatmap-legend" style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--mono)", fontSize: "9px", flexShrink: 0 }}>
          <span>Less</span>
          <span style={{ width: "10px", height: "10px", background: "rgba(0,0,0,0.05)", border: "1px solid var(--ink)" }} />
          <span style={{ width: "10px", height: "10px", background: "#B6FF3C", border: "1px solid var(--ink)" }} />
          <span style={{ width: "10px", height: "10px", background: "#00F0FF", border: "1px solid var(--ink)" }} />
          <span style={{ width: "10px", height: "10px", background: "#FF007A", border: "1px solid var(--ink)" }} />
          <span>More</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "flex", gap: "3px", minWidth: "520px" }}>
        {weeks.map((week, wIdx) => (
          <div key={wIdx} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {week.map((day) => {
              const isSelected = selectedDay === day.dateStr;
              return (
                <div
                  key={day.dateStr}
                  className="til-heatmap-cell"
                  onClick={() => onSelectDay(isSelected ? null : day.dateStr)}
                  title={`${day.dateStr}: ${day.count} ${day.count === 1 ? "entry" : "entries"}`}
                  style={{
                    width: "12px",
                    height: "12px",
                    background: getCellColor(day.count, isSelected),
                    border: isSelected ? "2px solid var(--ink)" : "1px solid var(--ink)",
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.2)" : "none",
                    zIndex: isSelected ? 2 : 1,
                    transition: "transform 0.1s ease",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
