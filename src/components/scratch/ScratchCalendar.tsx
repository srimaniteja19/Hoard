"use client";

import React, { useState, useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { generateMonthCalendar, DayActivity } from "@/lib/scratch/filters";
import { getLocalTodayIso } from "@/lib/scratch/parse";
import { playSound } from "@/lib/sound";

interface ScratchCalendarProps {
  scraps: ScrapRow[];
  selectedDate: string | null;
  onSelectDate: (dateIso: string | null) => void;
}

export const ScratchCalendar: React.FC<ScratchCalendarProps> = ({
  scraps,
  selectedDate,
  onSelectDate,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-indexed

  const calendarData = useMemo(() => {
    return generateMonthCalendar(scraps, currentYear, currentMonth, selectedDate);
  }, [scraps, currentYear, currentMonth, selectedDate]);

  const handlePrevMonth = () => {
    playSound.click();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    playSound.click();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    playSound.click();
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const todayIso = getLocalTodayIso(now);
    onSelectDate(todayIso);
  };

  const handleDayClick = (day: DayActivity) => {
    playSound.pop();
    if (selectedDate === day.dateIso) {
      // Toggle off
      onSelectDate(null);
    } else {
      onSelectDate(day.dateIso);
    }
  };

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="scratch-panel scratch-calendar-panel">
      {/* ── HEADER ── */}
      <div className="scratch-panel__h cal-h">
        <div className="cal-title">
          <span>◈ ACTIVITY CALENDAR</span>
        </div>
        <div className="cal-nav">
          <button
            type="button"
            className="cal-btn"
            onClick={handlePrevMonth}
            title="Previous month"
          >
            ‹
          </button>
          <span className="cal-month-label">
            {calendarData.monthName.slice(0, 3)} {currentYear}
          </span>
          <button
            type="button"
            className="cal-btn"
            onClick={handleNextMonth}
            title="Next month"
          >
            ›
          </button>
          <button
            type="button"
            className="cal-today-btn"
            onClick={handleJumpToday}
            title="Jump to today"
          >
            TODAY
          </button>
        </div>
      </div>

      {/* ── WEEKDAY HEADER ── */}
      <div className="cal-weekdays">
        {weekdays.map((w, idx) => (
          <span key={idx} className="cal-weekday">
            {w}
          </span>
        ))}
      </div>

      {/* ── CALENDAR MATRIX ── */}
      <div className="cal-grid">
        {calendarData.days.map((day) => {
          const hasScraps = day.scrapCount > 0;
          const heatLevel =
            day.scrapCount >= 4
              ? "heat-4"
              : day.scrapCount >= 2
              ? "heat-2"
              : day.scrapCount === 1
              ? "heat-1"
              : "heat-0";

          return (
            <button
              key={day.dateIso}
              type="button"
              className={`cal-day ${day.isCurrentMonth ? "in-month" : "out-month"} ${
                day.isToday ? "is-today" : ""
              } ${day.isSelected ? "is-selected" : ""} ${heatLevel}`}
              onClick={() => handleDayClick(day)}
              title={`${day.dateIso}: ${day.scrapCount} scrap${
                day.scrapCount === 1 ? "" : "s"
              }${day.hasImages ? " (📷 contains images)" : ""}`}
            >
              <span className="cal-day-num">{day.dayNumber}</span>
              {hasScraps && (
                <div className="cal-pips">
                  {day.hasImages && <span className="pip pip-img" />}
                  {day.kinds.slice(0, 3).map((k, kidx) => (
                    <span key={kidx} className={`pip pip-${k.toLowerCase()}`} />
                  ))}
                  {day.scrapCount > 1 && (
                    <span className="cal-count-badge">{day.scrapCount}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── FOOTER / FILTER INDICATOR ── */}
      <div className="cal-footer">
        {selectedDate ? (
          <div className="cal-selected-bar">
            <span>FILTER: <b>{selectedDate}</b></span>
            <button
              type="button"
              className="cal-clear-btn"
              onClick={() => onSelectDate(null)}
            >
              RESET ✕
            </button>
          </div>
        ) : (
          <div className="cal-summary">
            <span>{calendarData.totalScrapsInMonth} SCRAPS IN {calendarData.monthName}</span>
            <span className="cal-hint">Click a day to filter</span>
          </div>
        )}
      </div>
    </div>
  );
};
