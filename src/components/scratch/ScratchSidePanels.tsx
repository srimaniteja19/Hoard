"use client";

import React from "react";
import { ScratchStats } from "@/lib/dal/scratch";

interface ScratchSidePanelsProps {
  stats: ScratchStats | null;
  onSelectQuestion: (scrapId: string) => void;
  onBuryCompost: (ids: string[]) => Promise<void> | void;
  onKeepCompost: (ids: string[]) => Promise<void> | void;
}

export const ScratchSidePanels: React.FC<ScratchSidePanelsProps> = ({
  stats,
  onSelectQuestion,
  onBuryCompost,
  onKeepCompost,
}) => {
  if (!stats) return null;

  const { whereScrapsGo, openQuestionItems, compostItems } = stats;
  const compostIds = compostItems.map((c) => c.id);

  return (
    <aside className="scratch-side">
      {/* ── PANEL 1: OPEN QUESTIONS ── */}
      <div className="scratch-panel">
        <div className="scratch-panel__h">
          <span>OPEN QUESTIONS</span>
          <span>{openQuestionItems.length}</span>
        </div>

        {openQuestionItems.length === 0 ? (
          <div style={{ padding: "16px", fontSize: "12px", opacity: 0.6, fontFamily: "var(--mono)" }}>
            NO UNRESOLVED QUESTIONS. ASK ONE WITH A ? PREFIX.
          </div>
        ) : (
          openQuestionItems.slice(0, 5).map((q) => (
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

      {/* ── PANEL 2: WHERE SCRAPS GO ── */}
      <div className="scratch-panel">
        <div className="scratch-panel__h">
          <span>WHERE SCRAPS GO</span>
          <span>LAST 30 DAYS</span>
        </div>
        <div className="rate">
          <div className="rate__t">
            {whereScrapsGo.til > 0 && (
              <div className="r-til" style={{ flex: whereScrapsGo.til }}>
                {whereScrapsGo.til}
              </div>
            )}
            {whereScrapsGo.todo > 0 && (
              <div className="r-todo" style={{ flex: whereScrapsGo.todo }}>
                {whereScrapsGo.todo}
              </div>
            )}
            {whereScrapsGo.atlas > 0 && (
              <div className="r-atlas" style={{ flex: whereScrapsGo.atlas }}>
                {whereScrapsGo.atlas}
              </div>
            )}
            <div style={{ flex: Math.max(1, whereScrapsGo.raw) }}>
              {whereScrapsGo.raw}
            </div>
          </div>

          <div className="rate__k">
            <span>
              <i style={{ background: "var(--cyan)" }} />
              TIL {whereScrapsGo.til}
            </span>
            <span>
              <i style={{ background: "var(--lime)" }} />
              TODO {whereScrapsGo.todo}
            </span>
            <span>
              <i style={{ background: "var(--violet)" }} />
              ATLAS {whereScrapsGo.atlas}
            </span>
            <span>
              <i style={{ background: "transparent" }} />
              STILL RAW {whereScrapsGo.raw}
            </span>
          </div>

          <div className="rate__n">
            {whereScrapsGo.conversionRate}% OF SCRAPS BECAME SOMETHING. RAW ISN&apos;T
            FAILURE — BUT AFTER 60 DAYS IT&apos;S COMPOST.
          </div>
        </div>
      </div>

      {/* ── PANEL 3: THE COMPOST ── */}
      <div className="scratch-panel compost">
        <div className="scratch-panel__h">
          <span>THE COMPOST</span>
          <span>{compostItems.length} OVER 60 DAYS</span>
        </div>

        {compostItems.length === 0 ? (
          <div style={{ padding: "16px", fontSize: "12px", opacity: 0.6, fontFamily: "var(--mono)" }}>
            NO STALE SCRAPS IN THE COMPOST PILE.
          </div>
        ) : (
          compostItems.slice(0, 4).map((item) => (
            <div key={item.id} className="compost__r">
              <span>{item.dateLabel}</span>
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.content}
              </div>
            </div>
          ))
        )}

        {compostItems.length > 0 && (
          <div className="compost__a">
            <button
              type="button"
              onClick={() => onSelectQuestion(compostItems[0].id)}
            >
              REVIEW ALL
            </button>
            <button
              type="button"
              onClick={() => onKeepCompost(compostIds)}
            >
              KEEP
            </button>
            <button
              type="button"
              onClick={() => onBuryCompost(compostIds)}
            >
              BURY {compostItems.length}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
