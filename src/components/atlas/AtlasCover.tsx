"use client";

import Link from "next/link";
import { AtlasPunchRow } from "@/components/atlas/AtlasPunchRow";
import { AtlasSerialStub } from "@/components/atlas/AtlasSerialStub";
import { requiredProgress } from "@/lib/atlas/progress";
import { weeklyBudgetMinutes } from "@/lib/atlas/validate";
import { formatMinutes } from "@/lib/home/format";
import type { AtlasRecord } from "@/lib/atlas/types";

function weekStamp(atlas: AtlasRecord): string {
  const weeks = atlas.syllabus.weeks;
  if (weeks.length === 0) return `week — of ${atlas.weeksPlanned}`;
  const index = weeks.findIndex((week) => week.id === atlas.currentWeekId);
  const current = index >= 0 ? index + 1 : 1;
  return `week ${current} of ${weeks.length}`;
}

function statusStamp(status: AtlasRecord["status"]): string {
  if (status === "walking") return "OUT";
  if (status === "archived") return "CLOSED";
  return "PENDING";
}

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
  const body = (
    <>
      <span className="atlas-cover-lead">
        <span className="atlas-cover-title">{atlas.title}</span>
        <span className="atlas-cover-stamp">{statusStamp(atlas.status)}</span>
      </span>
      {variant === "large" && atlas.brief ? <span className="atlas-cover-brief">{atlas.brief}</span> : null}
      <span className="atlas-cover-stamps">
        <span className={`atlas-cover-depth is-${atlas.depth}`}>{atlas.depth}</span>
        <span className="atlas-cover-cadence">{atlas.cadence}</span>
        {variant === "large" ? (
          <>
            <span className="atlas-cover-budget">
              {formatMinutes(weeklyBudgetMinutes(atlas.minutesPerSession, atlas.cadence))} / week
            </span>
            <span className="atlas-cover-week">{weekStamp(atlas)}</span>
          </>
        ) : null}
      </span>
      {variant === "large" && atlas.antiScope.length > 0 ? (
        <span className="atlas-cover-antiscope">
          {atlas.antiScope.map((token) => (
            <span key={token}>no {token}</span>
          ))}
        </span>
      ) : null}
      <span className="atlas-cover-meta">
        <AtlasPunchRow done={done} total={total} />
        <span className="atlas-cover-count">
          {done}/{total}
        </span>
      </span>
    </>
  );

  return (
    <article className={`atlas-cover is-${variant} is-${atlas.status}`}>
      <div className="atlas-cover-tabwrap">
        <span className="atlas-folder-tab">
          <em>ATLAS</em>
          {atlas.weeksPlanned} WK
        </span>
        <AtlasSerialStub serial={atlas.serial} />
      </div>
      <div className="atlas-cover-body">
        {variant === "large" ? (
          <div className="atlas-cover-link">{body}</div>
        ) : (
          <Link href={`/atlas/${atlas.id}`} prefetch={false} className="atlas-cover-link">
            {body}
          </Link>
        )}
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
      </div>
    </article>
  );
}
