"use client";

import React from "react";
import { PlaybookRunRow, PlaybookRunStep } from "@/db/schema";
import { isStepLocked } from "@/lib/todos/playbooks";
import { playSound } from "@/lib/sound";

interface TodoRunPassProps {
  run: PlaybookRunRow;
  onToggleStep: (runId: string, stepIndex: number) => void;
  onAdvance: (runId: string) => void;
  onClose: (runId: string) => void;
  onAbandon: (runId: string) => void;
}

export const TodoRunPass: React.FC<TodoRunPassProps> = ({
  run,
  onToggleStep,
  onAdvance,
  onClose,
  onAbandon,
}) => {
  const steps = (run.steps || []) as PlaybookRunStep[];
  const total = steps.length;
  const doneList = steps.map((s) => !!s.done);
  const doneCount = doneList.filter(Boolean).length;
  const nextIncomplete = doneList.indexOf(false);
  const isAllDone = doneCount === total;
  const currentStep = nextIncomplete > -1 ? steps[nextIncomplete] : null;

  const colorVar = `var(--todo-${run.color || "violet"})`;

  const renderVarText = (text: string) => {
    const parts = text.split(/(<var>.*?<\/var>|\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith("<var>") && part.endsWith("</var>")) {
        const val = part.replace(/<\/?var>/g, "");
        return <var key={i}>{val}</var>;
      }
      if (part.startsWith("{{") && part.endsWith("}}")) {
        const k = part.slice(2, -2);
        const val = run.vars?.[k] || k;
        return <var key={i}>{val}</var>;
      }
      return part;
    });
  };

  return (
    <div className="pass" style={{ ["--pc" as any]: colorVar }}>
      {/* ── HEADER ── */}
      <div className="pass__h">
        <span>
          RUN PASS · NO. {run.runNumber} · {run.mode}
        </span>
        <span className="r">
          STEP {doneCount} OF {total}
        </span>
      </div>

      {/* ── BODY ── */}
      <div className="pass__b">
        <div className="pass__ct">
          <b>{doneCount}</b>
          <span>OF {total}</span>
        </div>

        <div className="pass__t">
          <button
            className={`box${isAllDone ? " done" : ""}`}
            type="button"
            onClick={() => {
              if (isAllDone) {
                playSound.promote();
                onClose(run.id);
              } else {
                playSound.click();
                onAdvance(run.id);
              }
            }}
            title={isAllDone ? "Complete & Close Run" : "Advance Step"}
          >
            ✓
          </button>
          <div className="tt">
            <b>{renderVarText(run.title)}</b>
            <div className="m">
              RUN PASS · {run.mode}
              {Object.keys(run.vars || {}).length > 0 && (
                <> · {Object.values(run.vars).join(" · ").toUpperCase()}</>
              )}
            </div>
          </div>
        </div>

        <div className="stamp">
          <small>{run.mode}</small>
          <b>{total} ST</b>
        </div>
      </div>

      {/* ── STEP CHAIN ── */}
      <div className="chain">
        <div className="chain__line">
          {steps.map((step, idx) => {
            const isDone = doneList[idx];
            const isLocked = isStepLocked(run.mode, idx, doneList);
            const isNow = idx === nextIncomplete;
            const nodeClass = isDone ? "done" : isNow ? "now" : isLocked ? "locked" : "future";

            const linkClass = isDone
              ? ""
              : isLocked
              ? " locked"
              : " future";

            return (
              <React.Fragment key={idx}>
                <span
                  className={`node ${nodeClass}`}
                  onClick={() => {
                    if (!isLocked) {
                      playSound.pop();
                      onToggleStep(run.id, idx);
                    }
                  }}
                  title={
                    isLocked
                      ? "Locked until previous steps complete"
                      : `Step ${idx + 1}: ${step.title}`
                  }
                >
                  <span className="dot">
                    <small>{(step.energy || "sh").slice(0, 2).toUpperCase()}</small>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </span>
                {idx < total - 1 && <span className={`link${linkClass}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="chain__lab">
          <span>TAP A NODE TO CLOSE THAT STEP</span>
          {run.mode === "SEQUENCE" ? (
            <span className="warn">LATER STEPS LOCK UNTIL THE ONE BEFORE CLOSES</span>
          ) : (
            <span>ANY ORDER</span>
          )}
          <span className="hot">
            {isAllDone
              ? "RUN COMPLETE ✓"
              : `NEXT · STEP ${String((nextIncomplete || 0) + 1).padStart(2, "0")}`}
          </span>
        </div>
      </div>

      {/* ── NOW STEP CARD ── */}
      {currentStep && (
        <div className="nowstep">
          <span className="lb">NOW</span>
          <span className="tt">{renderVarText(currentStep.title)}</span>
          <span className={`lane l-${currentStep.energy}`}>
            {currentStep.energy.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── FOOTER ACTIONS ── */}
      <div className="pass__f">
        <button
          className="adv"
          type="button"
          onClick={() => {
            playSound.click();
            if (isAllDone) {
              onClose(run.id);
            } else {
              onAdvance(run.id);
            }
          }}
        >
          {isAllDone ? "CLOSE RUN ✓" : "DONE · NEXT"}
        </button>
        <span className="fld">
          AT <span>——:—— ——</span>
        </span>
        <button
          type="button"
          onClick={() => {
            playSound.bury();
            onAbandon(run.id);
          }}
          title="Abandon this run pass"
        >
          ABANDON
        </button>
      </div>
    </div>
  );
};
