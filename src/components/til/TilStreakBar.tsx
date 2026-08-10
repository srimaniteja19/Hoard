"use client";

import React from "react";
import { Flame, AlertTriangle, ShieldCheck, Award } from "lucide-react";

interface TilStreakBarProps {
  currentStreak: number;
  longestStreak: number;
  streakAtRisk: boolean;
  skipsUsedThisMonth: number;
}

export const TilStreakBar: React.FC<TilStreakBarProps> = ({
  currentStreak,
  longestStreak,
  streakAtRisk,
  skipsUsedThisMonth,
}) => {
  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Top Banner Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: streakAtRisk ? "10px" : "0px",
        }}
      >
        {/* Current Streak */}
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh-sm)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#FF9100",
              border: "1.5px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
            }}
          >
            <Flame size={22} fill="#FFE600" />
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, opacity: 0.7 }}>
              CURRENT STREAK
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "20px", fontWeight: 900, color: "var(--ink)" }}>
              {currentStreak} {currentStreak === 1 ? "DAY" : "DAYS"}
            </div>
          </div>
        </div>

        {/* Longest Streak */}
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh-sm)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#FFE600",
              border: "1.5px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, opacity: 0.7 }}>
              LONGEST STREAK
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "20px", fontWeight: 900, color: "var(--ink)" }}>
              {longestStreak} {longestStreak === 1 ? "DAY" : "DAYS"}
            </div>
          </div>
        </div>

        {/* Skip Allowance */}
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh-sm)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#B6FF3C",
              border: "1.5px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, opacity: 0.7 }}>
              MONTHLY SKIPS
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)" }}>
              {skipsUsedThisMonth}/2 ALLOWANCE
            </div>
          </div>
        </div>
      </div>

      {/* Streak At Risk Warning Bar */}
      {streakAtRisk && (
        <div
          style={{
            background: "#FF007A",
            color: "#FFF",
            border: "var(--bd)",
            boxShadow: "var(--sh-sm)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900 }}>
            <AlertTriangle size={16} fill="#FFE600" color="#000" />
            <span>STREAK AT RISK: No entries logged today yet!</span>
          </div>

          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, background: "rgba(0,0,0,0.3)", padding: "2px 8px", border: "1px solid #FFF" }}>
            {skipsUsedThisMonth < 2 ? `2 skip-days/mo active (${2 - skipsUsedThisMonth} remaining)` : "0 skip-days remaining this month!"}
          </div>
        </div>
      )}
    </div>
  );
};
