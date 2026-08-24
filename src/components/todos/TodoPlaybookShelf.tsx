"use client";

import React from "react";
import { PlaybookRow, PlaybookStep } from "@/db/schema";
import { extractAllVariables, interpolateVariables } from "@/lib/todos/playbooks";
import { playSound } from "@/lib/sound";

interface TodoPlaybookShelfProps {
  playbooks: PlaybookRow[];
  totalRunsIssued: number;
  onIssuePass: (playbookId: string) => void;
  onEditPlaybook: (playbook: PlaybookRow) => void;
  onNewPlaybook: () => void;
}

export const TodoPlaybookShelf: React.FC<TodoPlaybookShelfProps> = ({
  playbooks,
  totalRunsIssued,
  onIssuePass,
  onEditPlaybook,
  onNewPlaybook,
}) => {
  // Compute summary stats
  const totalPlays = playbooks.length;
  const mostRun = [...playbooks].sort((a, b) => (b.runsCount || 0) - (a.runsCount || 0))[0];
  const avgKept =
    totalPlays > 0
      ? Math.round(playbooks.reduce((acc, p) => acc + (p.keptPercent || 80), 0) / totalPlays)
      : 82;

  const renderVarText = (text: string, vars: Record<string, string> = {}) => {
    const parts = text.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        const k = part.slice(2, -2);
        const val = vars[k] || k;
        return <var key={i}>{val}</var>;
      }
      return part;
    });
  };

  return (
    <div>
      {/* ── STATS BAR ── */}
      <div className="pbstats">
        <div>
          <b>{totalPlays}</b>
          <span>PLAYS ON THE SHELF</span>
        </div>
        <div className="hot">
          <b>{totalRunsIssued}</b>
          <span>PASSES ISSUED ALL TIME</span>
        </div>
        <div>
          <b>{mostRun ? `${mostRun.runsCount}×` : "0×"}</b>
          <span>MOST RUN · {mostRun ? mostRun.name.toUpperCase() : "NONE"}</span>
        </div>
        <div>
          <b>{avgKept}%</b>
          <span>RUNS THAT REACH THE END</span>
        </div>
        <div className="warn">
          <b>3</b>
          <span>STEPS YOU ALWAYS SKIP</span>
        </div>
      </div>

      {/* ── BANNER ── */}
      <div className="ban ban--dark">
        <b>Blank passes</b>
        <span>UNSTAMPED. ISSUE ONE AND IT BECOMES A RUN.</span>
      </div>

      {/* ── SHELF GRID ── */}
      <div className="shelf3">
        {playbooks.map((p) => {
          const steps = (p.steps || []) as PlaybookStep[];
          const colorVar = `var(--todo-${p.color || "violet"})`;
          const vars = (p.defaultVars || {}) as Record<string, string>;
          const varKeys = extractAllVariables(steps);
          const nv = varKeys.length;

          return (
            <div
              key={p.id}
              className="blank"
              style={{ ["--pc" as any]: colorVar }}
            >
              {/* Card Header */}
              <div className="blank__h">
                <span>BLANK PASS · {p.mode}</span>
                <span className="no">NO. ——— · UNSTAMPED</span>
              </div>

              {/* Title Banner */}
              <div className="blank__t">
                <b>{p.name}</b>
                <div className="m">
                  <span className="mode">{steps.length} STEPS</span>
                  <span>{nv ? `${nv} BLANK${nv > 1 ? "S" : ""}` : "NO BLANKS"}</span>
                  <span>KEEPS {p.keptPercent || 80}%</span>
                </div>
              </div>

              {/* Unstamped Chain */}
              <div className="blank__ch">
                <div className="chain__line">
                  {steps.map((s, idx) => (
                    <React.Fragment key={idx}>
                      <span className="node">
                        <span className="dot">
                          <small>{(s.energy || "sh").slice(0, 2).toUpperCase()}</small>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </span>
                      {idx < steps.length - 1 && <span className="link" />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="cap2">
                  ISSUE THIS PASS TO STAMP IT AND START THE CHAIN
                </div>
              </div>

              {/* Step Lines Preview */}
              <div className="blank__l">
                {steps.slice(0, 4).map((s, idx) => (
                  <div key={idx} className={s.optional ? "skip" : ""}>
                    <b>{String(idx + 1).padStart(2, "0")}</b>
                    <span>{renderVarText(s.title, vars)}</span>
                  </div>
                ))}
                {steps.length > 4 && (
                  <div>
                    <b>+{steps.length - 4}</b>
                    <span style={{ opacity: 0.45 }}>more</span>
                  </div>
                )}
              </div>

              {/* Stats Footer */}
              <div className="blank__st">
                <span>RUN {p.runsCount || 0}×</span>
                <span>MEDIAN {(p.medianDuration || "30m").toUpperCase()}</span>
              </div>

              {/* Actions */}
              <div className="blank__a">
                <button
                  className="issue"
                  type="button"
                  onClick={() => {
                    playSound.promote();
                    onIssuePass(p.id);
                  }}
                  title="Issue this pass as an active run"
                >
                  ISSUE A PASS ▸
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound.click();
                    onEditPlaybook(p);
                  }}
                  title="Edit playbook template"
                >
                  EDIT
                </button>
              </div>
            </div>
          );
        })}

        {/* ＋ NEW PLAY Card */}
        <div
          className="blank blank--new"
          onClick={() => {
            playSound.click();
            onNewPlaybook();
          }}
          title="Create a new playbook template"
        >
          <span>＋ NEW PLAY</span>
        </div>
      </div>
    </div>
  );
};
