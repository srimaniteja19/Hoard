"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface TodoTabsProps {
  activeTab: "today" | "book";
  onTabChange: (tab: "today" | "book") => void;
  todayCount: number;
  bookCount: number;
  inFlightCount: number;
  ritualCount: number;
}

export const TodoTabs: React.FC<TodoTabsProps> = ({
  activeTab,
  onTabChange,
  todayCount,
  bookCount,
  inFlightCount,
  ritualCount,
}) => {
  return (
    <div className="todos-tabs">
      <button
        type="button"
        data-v="today"
        aria-pressed={activeTab === "today"}
        onClick={() => {
          playSound.click();
          onTabChange("today");
        }}
      >
        Today<sup>{todayCount}</sup>
      </button>
      <button
        type="button"
        data-v="book"
        aria-pressed={activeTab === "book"}
        onClick={() => {
          playSound.click();
          onTabChange("book");
        }}
      >
        Playbook<sup>{bookCount}</sup>
      </button>
      <span className="sp" />
      <span className="meta">
        {inFlightCount} IN FLIGHT · {ritualCount} RITUAL{ritualCount === 1 ? "" : "S"} LIVE
      </span>
    </div>
  );
};
