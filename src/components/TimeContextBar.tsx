"use client";

import React, { useState } from "react";
import { ContextType } from "@/types";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";

interface TimeContextBarProps {
  time: number;
  setTime: (t: number) => void;
  ctx: ContextType;
  setCtx: (c: ContextType) => void;
}

export const TimeContextBar: React.FC<TimeContextBarProps> = ({
  time,
  setTime,
  ctx,
  setCtx,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const formatMins = (m: number) => {
    if (m >= 180) return "ANY TIME";
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  const contextName =
    ctx === "all"
      ? "ANYWHERE"
      : ctx === "desk"
      ? "AT DESK"
      : ctx === "commute"
      ? "COMMUTE"
      : "WIND DOWN";

  return (
    <div className="timebar-wrapper">
      {/* Mobile Toggle Trigger Header */}
      <button
        className="mobile-timebar-toggle"
        onClick={() => setIsOpenMobile(!isOpenMobile)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={14} /> <b>TIME FILTER:</b> {formatMins(time)} · {contextName}
        </span>
        {isOpenMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Main Bar Content (always visible on desktop, toggleable on mobile) */}
      <div className={`timebar ${isOpenMobile ? "mobile-open" : ""}`}>
        <div className="slidewrap">
          <label>I HAVE</label>
          <input
            type="range"
            min="5"
            max="180"
            step="5"
            value={time}
            onChange={(e) => setTime(+e.target.value)}
          />
          <b>{formatMins(time)}</b>
        </div>

        <div className="ctxg">
          <button
            className={ctx === "all" ? "on" : ""}
            onClick={() => setCtx("all")}
          >
            ANYWHERE
          </button>
          <button
            className={ctx === "desk" ? "on" : ""}
            onClick={() => setCtx("desk")}
          >
            AT MY DESK
          </button>
          <button
            className={ctx === "commute" ? "on" : ""}
            onClick={() => setCtx("commute")}
          >
            COMMUTING
          </button>
          <button
            className={ctx === "wind" ? "on" : ""}
            onClick={() => setCtx("wind")}
          >
            WINDING DOWN
          </button>
        </div>
      </div>
    </div>
  );
};
