"use client";

import React, { useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { ScratchStats } from "@/lib/dal/scratch";
import { ScratchCalendar } from "./ScratchCalendar";
import { extractAllTags } from "@/lib/scratch/filters";

interface ScratchSidePanelsProps {
  scraps: ScrapRow[];
  stats: ScratchStats | null;
  selectedDate: string | null;
  selectedTag: string | null;
  onSelectDate: (dateIso: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onSelectQuestion: (scrapId: string) => void;
  onBuryCompost: (ids: string[]) => Promise<void> | void;
  onKeepCompost: (ids: string[]) => Promise<void> | void;
}

export const ScratchSidePanels: React.FC<ScratchSidePanelsProps> = ({
  scraps,
  stats,
  selectedDate,
  selectedTag,
  onSelectDate,
  onSelectTag,
  onSelectQuestion,
  onBuryCompost,
  onKeepCompost,
}) => {
  const topTags = useMemo(() => {
    return extractAllTags(scraps);
  }, [scraps]);

  return (
    <aside className="scratch-side">
      {/* ── PANEL 1: MINI ACTIVITY CALENDAR ── */}
      <ScratchCalendar
        scraps={scraps}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      {/* ── PANEL 2: TAG CLOUD ── */}
      {topTags.length > 0 && (
        <div className="scratch-panel tag-cloud-panel">
          <div className="scratch-panel__h">
            <span>◈ TAG CLOUD</span>
            <span>{topTags.length} TAGS</span>
          </div>
          <div className="tag-cloud-body">
            {topTags.map((t) => {
              const isActive = selectedTag === t.tag;
              return (
                <button
                  key={t.tag}
                  type="button"
                  className={`tag-cloud-pill ${isActive ? "active" : ""}`}
                  onClick={() => onSelectTag(isActive ? null : t.tag)}
                >
                  <span className="tc-name">{t.tag}</span>
                  <span className="tc-count">{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PANEL 3: OPEN QUESTIONS ── */}
      {stats && (
        <div className="scratch-panel">
          <div className="scratch-panel__h">
            <span>OPEN QUESTIONS</span>
            <span>{stats.openQuestionItems.length}</span>
          </div>

          {stats.openQuestionItems.length === 0 ? (
            <div style={{ padding: "16px", fontSize: "12px", opacity: 0.6, fontFamily: "var(--mono)" }}>
              NO UNRESOLVED QUESTIONS. ASK ONE WITH A ? PREFIX.
            </div>
          ) : (
            stats.openQuestionItems.slice(0, 5).map((q) => (
              <div
                key={q.id}
                className="q__r"
                onClick={() => onSelectQuestion(q.id)}
              >
                <p>{q.content}</p>
                <span>{q.meta}</span>
              </div>
            ))
          )}

          <div className="q__f">
            A QUESTION STAYS OPEN UNTIL YOU ANSWER IT IN TIL.
          </div>
        </div>
      )}

      {/* ── PANEL 4: WHERE SCRAPS GO ── */}
      {stats && (
        <div className="scratch-panel">
          <div className="scratch-panel__h">
            <span>WHERE SCRAPS GO</span>
            <span>LAST 30 DAYS</span>
          </div>
          <div className="rate">
            <div className="rate__t">
              {stats.whereScrapsGo.til > 0 && (
                <div className="r-til" style={{ flex: stats.whereScrapsGo.til }}>
                  {stats.whereScrapsGo.til}
                </div>
              )}
              {stats.whereScrapsGo.todo > 0 && (
                <div className="r-todo" style={{ flex: stats.whereScrapsGo.todo }}>
                  {stats.whereScrapsGo.todo}
                </div>
              )}
              {stats.whereScrapsGo.atlas > 0 && (
                <div className="r-atlas" style={{ flex: stats.whereScrapsGo.atlas }}>
                  {stats.whereScrapsGo.atlas}
                </div>
              )}
              <div style={{ flex: Math.max(1, stats.whereScrapsGo.raw) }}>
                {stats.whereScrapsGo.raw}
              </div>
            </div>

            <div className="rate__k">
              <span>
                <i style={{ background: "var(--cyan)" }} />
                TIL {stats.whereScrapsGo.til}
              </span>
              <span>
                <i style={{ background: "var(--lime)" }} />
                TODO {stats.whereScrapsGo.todo}
              </span>
              <span>
                <i style={{ background: "var(--violet)" }} />
                ATLAS {stats.whereScrapsGo.atlas}
              </span>
              <span>
                <i style={{ background: "transparent" }} />
                STILL RAW {stats.whereScrapsGo.raw}
              </span>
            </div>

            <div className="rate__n">
              {stats.whereScrapsGo.conversionRate}% OF SCRAPS BECAME SOMETHING. RAW ISN&apos;T
              FAILURE — BUT AFTER 60 DAYS IT&apos;S COMPOST.
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL 5: THE COMPOST ── */}
      {stats && (
        <div className="scratch-panel compost">
          <div className="scratch-panel__h">
            <span>THE COMPOST</span>
            <span>{stats.compostItems.length} OVER 60 DAYS</span>
          </div>

          {stats.compostItems.length === 0 ? (
            <div style={{ padding: "16px", fontSize: "12px", opacity: 0.6, fontFamily: "var(--mono)" }}>
              NO STALE SCRAPS IN THE COMPOST PILE.
            </div>
          ) : (
            stats.compostItems.slice(0, 4).map((item) => (
              <div key={item.id} className="compost__r">
                <span>{item.dateLabel}</span>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.content}
                </div>
              </div>
            ))
          )}

          {stats.compostItems.length > 0 && (
            <div className="compost__a">
              <button
                type="button"
                onClick={() => onSelectQuestion(stats.compostItems[0].id)}
              >
                REVIEW ALL
              </button>
              <button
                type="button"
                onClick={() => onKeepCompost(stats.compostItems.map((c) => c.id))}
              >
                KEEP
              </button>
              <button
                type="button"
                onClick={() => onBuryCompost(stats.compostItems.map((c) => c.id))}
              >
                BURY {stats.compostItems.length}
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
