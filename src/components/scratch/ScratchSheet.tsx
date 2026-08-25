"use client";

import React, { useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { buildDaySummary } from "@/lib/scratch/tallies";
import { formatScrapDayHeader, getLocalTodayIso } from "@/lib/scratch/parse";
import { inlineMarkdown } from "@/lib/scratch/markdown";

interface ScratchSheetProps {
  scraps: ScrapRow[];
  isRail?: boolean;
  onTagClick?: (tag: string) => void;
}

interface DayGroup {
  dateIso: string;
  dayTitle: string;
  isToday: boolean;
  summary: string;
  items: ScrapRow[];
  empty?: boolean;
}

export const ScratchSheet: React.FC<ScratchSheetProps> = ({
  scraps,
  isRail = false,
  onTagClick,
}) => {
  const logScraps = useMemo(() => {
    return scraps.filter((s) => s.kind === "LOG");
  }, [scraps]);

  const dayGroups = useMemo(() => {
    const today = new Date();
    const todayIso = getLocalTodayIso(today);

    const map = new Map<string, ScrapRow[]>();
    for (const s of logScraps) {
      const d = s.occurredOn || s.loggedFor;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }

    // Sort dates descending
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    // Ensure today is always present at top
    if (!sortedDates.includes(todayIso)) {
      sortedDates.unshift(todayIso);
    }

    const groups: DayGroup[] = [];

    // If in rail mode, show today and up to 3 recent days
    const datesToDisplay = isRail ? sortedDates.slice(0, 2) : sortedDates;

    for (let i = 0; i < datesToDisplay.length; i++) {
      const dateIso = datesToDisplay[i];
      const items = map.get(dateIso) || [];
      const isToday = dateIso === todayIso;
      const dayTitle = formatScrapDayHeader(dateIso, todayIso);
      const summary = buildDaySummary(items);

      if (items.length === 0 && !isToday && !isRail) {
        groups.push({
          dateIso,
          dayTitle,
          isToday: false,
          summary: "NOTHING LOGGED",
          items: [],
          empty: true,
        });
      } else {
        groups.push({
          dateIso,
          dayTitle,
          isToday,
          summary,
          items,
          empty: items.length === 0 && !isToday,
        });
      }
    }

    return groups;
  }, [logScraps, isRail]);

  return (
    <div className={`sheet-root${isRail ? " rail" : ""}`}>
      {dayGroups.map((grp) => {
        if (grp.empty) {
          return (
            <div key={grp.dateIso} className="empty">
              {grp.dayTitle}
              <span />
              NOTHING LOGGED
            </div>
          );
        }

        return (
          <div key={grp.dateIso} className="sheet__day">
            {/* Day Header */}
            <div className={`dayhead${grp.isToday ? " today" : ""}`}>
              <b>{grp.dayTitle}</b>
              <i>{grp.items.length} LOGGED</i>
              <span className="sum">{grp.summary}</span>
            </div>

            {/* Empty today notice */}
            {grp.items.length === 0 && grp.isToday && (
              <div className="empty-day-banner">
                <span>✦ Nothing logged yet today. Type in The Slab above to record what you did!</span>
              </div>
            )}

            {/* Log Items */}
            {grp.items.map((it) => {
              const ent = it.entities || {};
              const color = ent.color || "orange";
              const glyph = ent.glyph || "·";
              const verb = ent.verb || "NOTED";
              const label = ent.label;
              const isPlain = ent.isPlain;
              const timeStr = new Date(it.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });

              return (
                <article
                  key={it.id}
                  className={`log${isPlain ? " log--plain" : ""}`}
                  style={{ "--c": `var(--${color})` } as React.CSSProperties}
                >
                  {/* Left Colored Cover Strip */}
                  <div className="log__cv">
                    <span className="gl">{glyph}</span>
                    <span className="vb">{verb}</span>
                  </div>

                  {/* Body */}
                  <div className="log__b">
                    {/* Title or Large Number */}
                    {ent.measure && ent.unit ? (
                      <div className="log__t">
                        {label && <small>{label}</small>}
                        <span className="log__n">
                          {ent.measure}
                          <em>{ent.unit}</em>
                        </span>
                        {ent.title && <div className="log__subt">{ent.title}</div>}
                      </div>
                    ) : (
                      <div className="log__t">
                        {label && <small>{label}</small>}
                        {ent.title || it.content}
                      </div>
                    )}

                    {/* Metadata & Badges */}
                    <div className="log__m">
                      {ent.tally && <span className="tal">{ent.tally}</span>}
                      {ent.firstLabel && <span className="first">{ent.firstLabel}</span>}
                      {ent.shiftNote && <span className="shift">{ent.shiftNote}</span>}
                      {ent.rating && <span className="tal rating">{ent.rating}</span>}
                      {ent.place && <span className="tg place">@{ent.place}</span>}
                      {ent.person && <span className="who-pill">with {ent.person}</span>}

                      {(it.tags || []).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="tg"
                          onClick={() => onTagClick?.(t)}
                        >
                          {t}
                        </button>
                      ))}

                      <span className="when">{timeStr}</span>

                      {/* Optional Note */}
                      {it.notes && it.notes.trim() && (
                        <span
                          className="note"
                          dangerouslySetInnerHTML={{ __html: inlineMarkdown(it.notes) }}
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
