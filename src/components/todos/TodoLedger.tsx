"use client";

import React from "react";
import { PlaybookRunRow, PlaybookRunStep } from "@/db/schema";

interface TodoLedgerProps {
  runs: PlaybookRunRow[];
}

export const TodoLedger: React.FC<TodoLedgerProps> = ({ runs }) => {
  const displayRuns = runs.slice(0, 12);

  return (
    <div>
      {/* ── BANNER ── */}
      <div className="ban">
        <b>The ledger</b>
        <span>EVERY PASS EVER ISSUED.</span>
      </div>

      {/* ── LEDGER CARD ── */}
      <div className="ledger">
        <div className="ledger__h">
          <span>RUN HISTORY</span>
          <span>
            LAST {displayRuns.length} OF {runs.length}
          </span>
        </div>

        <div>
          {displayRuns.map((r) => {
            const steps = (r.steps || []) as PlaybookRunStep[];
            const doneCount = steps.filter((s) => s.done).length;
            const totalSteps = Math.max(steps.length, 1);

            let statusBadge = <span className="ok">KEPT</span>;
            if (r.state === "ABANDONED") {
              statusBadge = <span className="ab">ABANDONED</span>;
            } else if (r.state === "LIVE") {
              statusBadge = (
                <span className="ok" style={{ background: "var(--todo-cyan)" }}>
                  LIVE
                </span>
              );
            }

            return (
              <div key={r.id} className="lrow">
                <span className="dt">NO. {r.runNumber}</span>
                <span className="nm">{r.title}</span>
                <span className="pips">
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <i key={idx} className={idx < doneCount ? "on" : ""} />
                  ))}
                </span>
                <span className="dur">{r.duration || "—"}</span>
                {statusBadge}
              </div>
            );
          })}

          {displayRuns.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", opacity: 0.5 }}>
              No runs recorded yet. Issue a pass from the Playbook shelf to start your first run!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
