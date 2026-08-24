"use client";

import React, { useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { ScratchStats } from "@/lib/dal/scratch";
import {
  computeTallies,
  getOnThisDay,
  getGoneQuiet,
  buildTagTree,
  TagTreeNode,
} from "@/lib/scratch/tallies";
import { playSound } from "@/lib/sound";

interface ScratchSidePanelsProps {
  scraps: ScrapRow[];
  stats: ScratchStats | null;
  mode?: "stream" | "logbook";
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onSelectQuestion: (scrapId: string) => void;
  onBuryCompost: (ids: string[]) => Promise<void> | void;
  onKeepCompost: (ids: string[]) => Promise<void> | void;
}

export const ScratchSidePanels: React.FC<ScratchSidePanelsProps> = ({
  scraps,
  stats,
  mode = "stream",
  selectedTag,
  onSelectTag,
  onSelectQuestion,
  onBuryCompost,
  onKeepCompost,
}) => {
  const tagTree = useMemo(() => {
    return buildTagTree(scraps);
  }, [scraps]);

  const tallies = useMemo(() => {
    return computeTallies(scraps);
  }, [scraps]);

  const onThisDayItems = useMemo(() => {
    return getOnThisDay(scraps);
  }, [scraps]);

  const goneQuietItems = useMemo(() => {
    return getGoneQuiet(scraps);
  }, [scraps]);

  // Render Logbook Side Panels
  if (mode === "logbook") {
    return (
      <aside className="side">
        {/* ── PANEL 1: TALLIES (SELF-BUILT) ── */}
        <div className="panel">
          <div className="panel__h">
            <span>TALLIES · {new Date().getFullYear()}</span>
            <span>SELF-BUILT</span>
          </div>

          {tallies.length === 0 ? (
            <div style={{ padding: "14px", fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6 }}>
              NO LOGGED TALLIES YET. LOG FILMS, BOOKS, WALKS, OR FOOD TO BUILD TALLIES AUTOMATICALLY.
            </div>
          ) : (
            tallies.map((tal) => (
              <div key={tal.key} className="tal__r">
                <i style={{ background: `var(--${tal.color})` }} />
                <span className="lb2">{tal.label}</span>
                <span className="n">{tal.count.toLocaleString()}</span>
                <span className={`dl ${tal.isUp ? "up" : "dn"}`}>{tal.deltaText}</span>
              </div>
            ))
          )}

          <div className="panel__f">
            ARROWS COMPARE WITH THIS POINT LAST YEAR. NO COUNTER WAS EVER CONFIGURED — EACH CAME OUT OF A SENTENCE.
          </div>
        </div>

        {/* ── PANEL 2: ON THIS DAY ── */}
        {onThisDayItems.length > 0 && (
          <div className="panel onthis">
            <div className="panel__h">
              <span>ON THIS DAY</span>
              <span>{onThisDayItems.length}</span>
            </div>
            {onThisDayItems.map((item) => (
              <div key={item.id} className="onthis__r">
                <p>{item.title}</p>
                <span>{item.dateStr}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── PANEL 3: GONE QUIET ── */}
        {goneQuietItems.length > 0 && (
          <div className="panel">
            <div className="panel__h">
              <span>GONE QUIET</span>
              <span>{goneQuietItems.length}</span>
            </div>
            {goneQuietItems.map((item) => (
              <div key={item.verb} className="gaps__r">
                <b>{item.verb}</b>
                {item.isBrokenToday ? (
                  <span className="ok">BROKEN TODAY</span>
                ) : (
                  <span className="bad">{item.daysAgo} DAYS</span>
                )}
              </div>
            ))}
            <div className="panel__f">
              VERBS YOU USED TO LOG REGULARLY AND HAVEN&apos;T LATELY. THE GAP, NOT A NAG.
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Render Stream Side Panels
  return (
    <aside className="side">
      {/* ── PANEL 1: TAG TREE (DERIVED) ── */}
      {tagTree.length > 0 && (
        <div className="panel">
          <div className="panel__h">
            <span>TAGS</span>
            <span>DERIVED</span>
          </div>

          <div className="tree">
            {tagTree.map((node) => {
              const isRootActive = selectedTag === node.tag;
              return (
                <React.Fragment key={node.tag}>
                  <div
                    className={`tree__r${isRootActive ? " active" : ""}`}
                    onClick={() => {
                      playSound.pop();
                      onSelectTag(isRootActive ? null : node.tag);
                    }}
                  >
                    <i style={{ background: `var(--${node.color})` }} />
                    <span className="n">{node.tag}</span>
                    <span className="c">{node.count}</span>
                  </div>

                  {node.children.map((child: TagTreeNode) => {
                    const isChildActive = selectedTag === child.tag;
                    return (
                      <div
                        key={child.tag}
                        className={`tree__r kid${isChildActive ? " active" : ""}`}
                        onClick={() => {
                          playSound.pop();
                          onSelectTag(isChildActive ? null : child.tag);
                        }}
                      >
                        <i style={{ background: `var(--${child.color})` }} />
                        <span className="n">{child.tag}</span>
                        <span className="c">{child.count}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          <div className="panel__f">
            NESTING IS DERIVED FROM CO-OCCURRENCE, RECOMPUTED NIGHTLY. YOU ONLY EVER TYPE FLAT TAGS.
          </div>
        </div>
      )}

      {/* ── PANEL 2: OPEN QUESTIONS ── */}
      {stats && (
        <div className="panel">
          <div className="panel__h">
            <span>OPEN QUESTIONS</span>
            <span>{stats.openQuestionItems.length}</span>
          </div>

          {stats.openQuestionItems.length === 0 ? (
            <div style={{ padding: "14px", fontSize: "11px", opacity: 0.6, fontFamily: "var(--mono)" }}>
              NO UNRESOLVED QUESTIONS. ASK ONE WITH A ? PREFIX.
            </div>
          ) : (
            stats.openQuestionItems.slice(0, 4).map((q) => (
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

          <div className="panel__f">
            A QUESTION STAYS OPEN UNTIL YOU ANSWER IT IN TIL.
          </div>
        </div>
      )}

      {/* ── PANEL 2.5: INK HEALTH ── */}
      <div className="panel">
        <div className="panel__h">
          <span>INK HEALTH</span>
          <span>
            {stats?.inkHealth?.total ?? scraps.filter((s) => s.kind === "INK").length} SCRAPS
          </span>
        </div>
        <div className="q__r">
          <p style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em" }}>
            {stats?.inkHealth?.transcribed ?? scraps.filter((s) => s.kind === "INK" && s.entities?.transcription).length} TRANSCRIBED ·{" "}
            {stats?.inkHealth?.untranscribed ?? scraps.filter((s) => s.kind === "INK" && !s.entities?.transcription).length} NOT
          </p>
          <span>UNTRANSCRIBED INK IS INVISIBLE TO SEARCH AND COLLISION</span>
        </div>
        <div className="panel__f">
          ONE LINE IS ENOUGH. THE STROKES STAY — THE CAPTION JUST MAKES THEM FINDABLE.
        </div>
      </div>

      {/* ── PANEL 3: WHERE SHELF SCRAPS GO ── */}
      {stats && (
        <div className="panel">
          <div className="panel__h">
            <span>WHERE SHELF SCRAPS GO</span>
            <span>30 DAYS</span>
          </div>

          <div className="rate">
            <div className="rate__t">
              {stats.whereScrapsGo.til > 0 && (
                <div className="r1" style={{ flex: stats.whereScrapsGo.til }}>
                  {stats.whereScrapsGo.til}
                </div>
              )}
              {stats.whereScrapsGo.todo > 0 && (
                <div className="r2" style={{ flex: stats.whereScrapsGo.todo }}>
                  {stats.whereScrapsGo.todo}
                </div>
              )}
              {stats.whereScrapsGo.atlas > 0 && (
                <div className="r3" style={{ flex: stats.whereScrapsGo.atlas }}>
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
                <i />
                OPEN {stats.whereScrapsGo.raw}
              </span>
            </div>
          </div>

          <div className="panel__f">
            {stats.whereScrapsGo.conversionRate}% PROMOTED. LOG ENTRIES ARE EXCLUDED — THEY WERE NEVER MEANT TO GO ANYWHERE.
          </div>
        </div>
      )}

      {/* ── PANEL 4: THE COMPOST ── */}
      {stats && stats.compostItems.length > 0 && (
        <div className="panel compost">
          <div className="panel__h">
            <span>THE COMPOST</span>
            <span>{stats.compostItems.length} OVER 60 DAYS</span>
          </div>

          {stats.compostItems.slice(0, 3).map((item) => (
            <div key={item.id} className="compost__r">
              <span>{item.dateLabel}</span>
              {item.content}
            </div>
          ))}

          <div className="compost__a">
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onKeepCompost(stats.compostItems.map((i) => i.id));
              }}
            >
              KEEP
            </button>
            <button
              type="button"
              onClick={() => {
                playSound.bury();
                onBuryCompost(stats.compostItems.map((i) => i.id));
              }}
            >
              BURY {stats.compostItems.length}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
