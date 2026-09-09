"use client";

import React from "react";
import { ReaderIssue } from "@/types/reader";

interface ReaderDeckBarProps {
  deckIssues: ReaderIssue[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ReaderDeckBar({
  deckIssues,
  currentIndex,
  onSelectIndex,
  onPrev,
  onNext,
}: ReaderDeckBarProps) {
  const currentIssue = deckIssues[currentIndex];
  const total = deckIssues.length;

  const minutesLeft = deckIssues
    .slice(currentIndex)
    .reduce((acc, iss) => acc + (iss.readMinutes || 1), 0);

  return (
    <div className="reader-deck">
      <span className="lb" id="deckPos">
        {total > 0 ? `${currentIndex + 1} OF ${total}` : "0 OF 0"}
      </span>

      <div className="dots" id="dots">
        {deckIssues.map((issue, idx) => {
          let dotCls = "";
          if (idx === currentIndex) {
            dotCls = "now";
          } else if (issue.status === "kept" || issue.keptCount > 0) {
            dotCls = "kept";
          } else if (issue.status !== "unread") {
            dotCls = "read";
          }

          return (
            <i
              key={issue.id}
              className={dotCls}
              onClick={() => onSelectIndex(idx)}
              title={`${issue.sender} · ${issue.readMinutes}m`}
            />
          );
        })}
      </div>

      <span className="lb" id="deckLeft">
        {minutesLeft} MIN LEFT
      </span>

      <div className="nav">
        <button
          id="prev"
          type="button"
          disabled={currentIndex <= 0}
          onClick={onPrev}
          title="Previous issue (K)"
        >
          ← K
        </button>
        <button
          id="next"
          type="button"
          onClick={onNext}
          title={currentIndex >= total - 1 ? "Complete deck & view receipt (J)" : "Next issue (J)"}
        >
          J →
        </button>
      </div>
    </div>
  );
}
