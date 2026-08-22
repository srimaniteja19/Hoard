"use client";

import { requiredProgress } from "@/lib/atlas/progress";
import type { AtlasStation, AtlasWeekDraft } from "@/lib/atlas/types";

function splitWeekLabel(label: string, index: number): { num: string; name: string } {
  const match = label.match(/^(?:week\s*)?(\d+)\s*[—–-]\s*(.+)$/i);
  if (match?.[1] && match[2]) {
    return { num: match[1].padStart(2, "0"), name: match[2].trim() };
  }
  return { num: String(index + 1).padStart(2, "0"), name: label };
}

export function AtlasWeekTabs({
  weeks,
  stations,
  openWeekId,
  pinnedWeekId,
  onPeek,
  onPin,
}: {
  weeks: AtlasWeekDraft[];
  stations: AtlasStation[];
  openWeekId: string | null;
  pinnedWeekId: string | null;
  onPeek: (weekId: string) => void;
  onPin: (weekId: string) => void;
}) {
  return (
    <div className="atlas-week-tabs" role="tablist" aria-label="Weeks">
      {weeks.map((week, index) => {
        const weekSyllabus = {
          thin: false,
          hoursPerWeek: 0,
          weeks: [week],
          stations: stations.filter((s) => s.weekId === week.id),
        };
        const { done, total } = requiredProgress(weekSyllabus);
        const selected = openWeekId === week.id;
        const pinned = pinnedWeekId === week.id;
        const { num, name } = splitWeekLabel(week.label, index);
        return (
          <div
            key={week.id}
            className={`atlas-week-tab is-leg-${index % 6}${selected ? " is-open" : ""}${pinned ? " is-pinned" : ""}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onPeek(week.id)}
            >
              <span className="atlas-week-num" aria-hidden>
                {num}
              </span>
              <span className="atlas-week-copy">
                <span className="atlas-week-kicker">Week</span>
                <span className="atlas-week-name">{name}</span>
                <span className="atlas-week-meta">
                  {done}/{total} · {week.estimatedMinutes}m
                </span>
              </span>
            </button>
            {selected ? (
              <button
                type="button"
                className="atlas-week-pin"
                onClick={() => onPin(week.id)}
                disabled={pinned}
              >
                {pinned ? "OUT" : "Hold"}
              </button>
            ) : pinned ? (
              <span className="atlas-week-pin is-mark">OUT</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
