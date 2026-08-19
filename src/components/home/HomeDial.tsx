"use client";

import type { ContextType } from "@/types";
import { ANY_TIME_MINUTES } from "@/lib/home/pack";
import { formatMinutes } from "@/lib/home/format";

const CONTEXTS: ContextType[] = ["all", "desk", "commute", "wind"];
const TICKS = [15, 30, 45, 60, 90, 120, 180];

export function HomeDial({
  time,
  ctx,
  onChange,
}: {
  time: number;
  ctx: ContextType;
  onChange: (time: number, ctx: ContextType) => void;
}) {
  const percent = ((time - 5) / (ANY_TIME_MINUTES - 5)) * 100;

  return (
    <div className="home-lead-instrument">
      <div>
        <div className="home-kicker" id="home-time-label">
          I HAVE
        </div>
        <div className="home-dial-readout" aria-live="polite">
          {time === ANY_TIME_MINUTES ? "ANY TIME" : formatMinutes(time).toUpperCase()}
        </div>
      </div>
      <div className="home-dial-track">
        <input
          id="home-time"
          className="home-dial-input"
          type="range"
          min={5}
          max={ANY_TIME_MINUTES}
          step={5}
          value={time}
          aria-labelledby="home-time-label"
          onChange={(event) => onChange(Number(event.target.value), ctx)}
          style={{ ["--dial" as string]: `${percent}%` }}
        />
        <div className="home-dial-ticks" aria-hidden="true">
          {TICKS.map((tick) => (
            <button
              key={tick}
              type="button"
              className="home-dial-tick"
              data-on={tick === time ? "true" : "false"}
              tabIndex={-1}
              onClick={() => onChange(tick, ctx)}
            >
              {tick === ANY_TIME_MINUTES ? "ANY" : tick}
            </button>
          ))}
        </div>
      </div>
      <div className="home-ctx" role="group" aria-label="Context">
        {CONTEXTS.map((context) => (
          <button
            key={context}
            type="button"
            aria-pressed={context === ctx}
            onClick={() => onChange(time, context)}
          >
            {context.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
