"use client";

import React from "react";
import Link from "next/link";
import { ReaderPaperTheme } from "@/types/reader";

interface ReaderRailProps {
  activeView?: "list" | "read" | "receipt";
  paperTheme: ReaderPaperTheme;
  onTogglePaperTheme: (theme: ReaderPaperTheme) => void;
  onStartDeck?: () => void;
}

export function ReaderRail({
  activeView = "list",
  paperTheme,
  onTogglePaperTheme,
  onStartDeck,
}: ReaderRailProps) {
  return (
    <div className="reader-rail">
      <Link href="/">HOME</Link>
      <Link href="/library">LIBRARY</Link>
      <Link href="/reader" className={activeView === "list" ? "on" : ""}>
        READER
      </Link>
      <Link href="/library?type=LINK">STACKS</Link>
      <Link href="/til">TIL</Link>
      <Link href="/ledger">DUES</Link>

      <span className="sp" />

      {onStartDeck ? (
        <button className="go" id="startDeck" type="button" onClick={onStartDeck}>
          ▶ READ TODAY&apos;S DECK
        </button>
      ) : null}

      <span className="reader-seg" id="papers">
        <button
          data-p="cream"
          aria-pressed={paperTheme === "cream"}
          type="button"
          onClick={() => onTogglePaperTheme("cream")}
        >
          CREAM
        </button>
        <button
          data-p="ink"
          aria-pressed={paperTheme === "ink"}
          type="button"
          onClick={() => onTogglePaperTheme("ink")}
        >
          INK
        </button>
      </span>
    </div>
  );
}
