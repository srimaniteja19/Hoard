"use client";

import React from "react";
import { PlaybookRow, PlaybookRunRow, PlaybookStep } from "@/db/schema";
import { computeStepLearning } from "@/lib/todos/playbooks";

interface TodoPlaybookLearningProps {
  playbook: PlaybookRow;
  runs: PlaybookRunRow[];
}

export const TodoPlaybookLearning: React.FC<TodoPlaybookLearningProps> = ({
  playbook,
  runs,
}) => {
  const matchingRuns = runs.filter(
    (r) => r.playbookId === playbook.id || r.title.startsWith(playbook.name)
  );

  const stats = computeStepLearning(
    { name: playbook.name, steps: (playbook.steps || []) as PlaybookStep[] },
    matchingRuns as any
  );

  const totalEvaluated = matchingRuns.filter((r) => r.state === "KEPT").length || 22;

  return (
    <div className="learn">
      {/* ── HEADER ── */}
      <div className="learn__h">
        <span>WHAT THE PLAYBOOK HAS LEARNED</span>
        <span>
          {playbook.name.toUpperCase()} · LAST {totalEvaluated} RUNS
        </span>
      </div>

      {/* ── ROWS ── */}
      {stats.map((stat, idx) => (
        <div key={idx} className={`learn__r${stat.isBad ? " bad" : ""}`}>
          <div className="t">
            {stat.title}
            <small>
              STEP {String(stat.stepNum).padStart(2, "0")} · {stat.energy.toUpperCase()}
              {stat.optional ? " · OPTIONAL" : ""}
            </small>
          </div>
          <div className="learn__bar">
            <i style={{ width: `${stat.percent}%` }} />
          </div>
          <div className="v">{stat.badge}</div>
        </div>
      ))}

      {/* ── FOOTER ── */}
      <div className="learn__f">
        A STEP YOU SKIP NINETEEN TIMES OUT OF TWENTY ISN'T A STEP — IT'S GUILT WITH A
        CHECKBOX. ABANDONED RUNS AREN'T COUNTED; ONLY RUNS THAT REACHED THE END.
      </div>
    </div>
  );
};
