"use client";

import Link from "next/link";
import type { DayBlock } from "@/lib/home/types";
import { formatMinutes, parseHm } from "@/lib/home/format";

export function HomeDayStrip({
  blocks,
  freeMinutes,
  unfittedCount,
  unfittedMinutes,
  nowPercent,
  ariaLabel,
}: {
  blocks: DayBlock[];
  freeMinutes: number;
  unfittedCount: number;
  unfittedMinutes: number;
  nowPercent: number;
  ariaLabel: string;
}) {
  const clampedNow = Math.min(100, Math.max(0, nowPercent));

  return (
    <Link href="/todos" className="home-day" aria-label={ariaLabel}>
      <div className="home-day-meta">
        <span>TODAY · {formatMinutes(freeMinutes)} FREE</span>
        <span>{blocks.length ? `${blocks.length} busy` : "Busy: none"}</span>
      </div>
      <div className="home-day-track">
        {blocks.map((block) => {
          const start = (parseHm(block.start) / (24 * 60)) * 100;
          const end = (parseHm(block.end) / (24 * 60)) * 100;
          const width = Math.max(1.2, end - start);
          return (
            <span
              key={`${block.title}-${block.start}`}
              className="home-day-block"
              style={{ left: `${start}%`, width: `${width}%` }}
              title={`${block.title} ${block.start}–${block.end}`}
            >
              {block.title.toUpperCase()}
            </span>
          );
        })}
        <span className="home-day-now" style={{ left: `${clampedNow}%` }} />
      </div>
      {unfittedCount > 0 && (
        <div className="home-day-shortfall">
          {unfittedCount} task{unfittedCount === 1 ? "" : "s"} ({formatMinutes(unfittedMinutes)}){" "}
          won&apos;t fit today. Move them now rather than at midnight.
        </div>
      )}
    </Link>
  );
}
