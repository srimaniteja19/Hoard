"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface TodoTabsProps {
  activeTab: "today" | "book" | "counter";
  onTabChange: (tab: "today" | "book" | "counter") => void;
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
      <button
        type="button"
        data-v="counter"
        aria-pressed={activeTab === "counter"}
        onClick={() => {
          playSound.click();
          onTabChange("counter");
        }}
      >
        The Counter<sup>30d</sup>
      </button>
      <span className="sp" />
      <span className="meta">
        {inFlightCount} IN FLIGHT · {ritualCount} RITUAL{ritualCount === 1 ? "" : "S"} LIVE
      </span>
    </div>
  );
};
