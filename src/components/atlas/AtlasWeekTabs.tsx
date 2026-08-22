"use client";

import { requiredProgress } from "@/lib/atlas/progress";
import type { AtlasStation, AtlasWeekDraft } from "@/lib/atlas/types";

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
      {weeks.map((week) => {
        const weekSyllabus = {
          thin: false,
          hoursPerWeek: 0,
          weeks: [week],
          stations: stations.filter((s) => s.weekId === week.id),
        };
        const { done, total } = requiredProgress(weekSyllabus);
        const selected = openWeekId === week.id;
        const pinned = pinnedWeekId === week.id;
        return (
          <div key={week.id} className={`atlas-week-tab${selected ? " is-open" : ""}${pinned ? " is-pinned" : ""}`}>
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onPeek(week.id)}
            >
              {week.label} · {done}/{total} · {week.estimatedMinutes}m
            </button>
            {selected ? (
              <button
                type="button"
                className="atlas-week-pin"
                onClick={() => onPin(week.id)}
                disabled={pinned}
              >
                {pinned ? "Pinned" : "Pin"}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
