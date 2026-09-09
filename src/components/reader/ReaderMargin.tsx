"use client";

import React from "react";
import { ReaderKeep } from "@/types/reader";

interface ReaderMarginProps {
  keeps: ReaderKeep[];
  sender: string;
  onRemoveKeep: (keepId: string) => void;
}

export function ReaderMargin({ keeps, sender, onRemoveKeep }: ReaderMarginProps) {
  const count = keeps.length;

  return (
    <aside className="reader-margin">
      <div className="reader-margin__h">
        <span>THE MARGIN</span>
        <span>
          <b id="hvN">{count}</b> KEPT
        </span>
      </div>

      <div className="reader-harvest" id="harvest">
        {count === 0 ? (
          <div className="reader-margin__empty">
            NOTHING KEPT YET.
            <br />
            <br />
            SELECT ANY TEXT AND PRESS <b>S</b>.
            <br />
            WHAT YOU KEEP LANDS HERE AS YOU READ.
          </div>
        ) : (
          keeps.map((h) => {
            const kindLabel =
              h.kind === "CLAIM"
                ? `CLAIM · ${sender.toUpperCase()}`
                : h.kind === "LINK"
                ? "LINK → STACKS · CANDIDATE"
                : "FIGURE";

            const borderCol =
              h.color ||
              (h.kind === "CLAIM"
                ? "var(--reader-pink)"
                : h.kind === "LINK"
                ? "var(--reader-cyan)"
                : "var(--reader-violet)");

            return (
              <div key={h.id} className="reader-hv" style={{ "--kc": borderCol } as React.CSSProperties}>
                <div className="k">{kindLabel}</div>
                {h.quote ? <div className="q">“{h.quote}”</div> : null}
                <div className="r">{h.reason}</div>
                <button
                  className="x"
                  type="button"
                  onClick={() => onRemoveKeep(h.id)}
                  title="Remove this keep"
                >
                  REMOVE
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="reader-margin__f" id="marginFoot">
        {count > 0
          ? "GOES TO TIL WITH THE SOURCE ATTACHED WHEN YOU CLOSE THE ISSUE."
          : "AN ISSUE YOU FINISH AND KEEP NOTHING FROM IS RECORDED AS EXACTLY THAT. READING ISN'T THE ACHIEVEMENT."}
      </div>
    </aside>
  );
}
