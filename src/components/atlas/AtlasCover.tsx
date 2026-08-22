"use client";

import Link from "next/link";
import { requiredProgress } from "@/lib/atlas/progress";
import type { AtlasRecord } from "@/lib/atlas/types";

export function AtlasCover({
  atlas,
  variant = "compact",
  onArchive,
  onRestore,
  onDrop,
}: {
  atlas: AtlasRecord;
  variant?: "compact" | "large";
  onArchive?: () => void;
  onRestore?: () => void;
  onDrop?: () => void;
}) {
  const { done, total } = requiredProgress(atlas.syllabus);
  const showDrop = atlas.status !== "walking" && onDrop;
  const showArchive = atlas.status !== "archived" && onArchive;
  const showRestore = atlas.status === "archived" && onRestore;

  return (
    <article className={`atlas-cover is-${variant}`}>
      <Link href={`/atlas/${atlas.id}`} className="atlas-cover-link">
        <span className="atlas-cover-kicker">
          ATLAS · {atlas.serial} · {atlas.weeksPlanned} WEEKS
        </span>
        <span className="atlas-cover-title">{atlas.title}</span>
        <span className="atlas-cover-meta">
          <span className="atlas-cover-progress">
            {done} / {total}
          </span>
          <span className={`atlas-pill is-${atlas.status}`}>{atlas.status}</span>
        </span>
      </Link>
      {showArchive || showRestore || showDrop ? (
        <div className="atlas-cover-actions">
          {showArchive ? (
            <button type="button" onClick={onArchive}>
              Archive
            </button>
          ) : null}
          {showRestore ? (
            <button type="button" onClick={onRestore}>
              Restore
            </button>
          ) : null}
          {showDrop ? (
            <button type="button" className="is-drop" onClick={onDrop}>
              Drop
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
