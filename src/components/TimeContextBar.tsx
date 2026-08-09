"use client";

import React from "react";
import { ContextType } from "@/types";

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
  const formatMins = (m: number) => {
    if (m >= 180) return "ANY TIME";
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  return (
    <div className="timebar">
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
  );
};
