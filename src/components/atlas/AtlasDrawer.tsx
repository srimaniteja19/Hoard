"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtlasOne } from "@/hooks/useAtlas";
import { weekLoad } from "@/lib/atlas/progress";
import { weeklyBudgetMinutes } from "@/lib/atlas/validate";
import { formatMinutes } from "@/lib/home/format";
import { AtlasCover } from "@/components/atlas/AtlasCover";
import { AtlasStation } from "@/components/atlas/AtlasStation";
import { AtlasWeekTabs } from "@/components/atlas/AtlasWeekTabs";

function loadLine(openRequired: number, openMinutes: number, overflowMinutes: number): string {
  const base = `${openRequired} left · ${formatMinutes(openMinutes)}`;
  if (overflowMinutes > 0) return `${base} · ${formatMinutes(overflowMinutes)} won’t fit`;
  return base;
}

export function AtlasDrawer({ id }: { id: string }) {
  const router = useRouter();
  const {
    atlas,
    loading,
    missing,
    filing,
    resourcing,
    streamError,
    toggle,
    setNote,
    pinWeek,
    archive,
    restore,
    drop,
    retryRest,
    regenerate,
    fork,
  } = useAtlasOne(id);
  const [peekWeekId, setPeekWeekId] = useState<string | null>(null);

  const weeks = atlas?.syllabus.weeks ?? [];
  const openWeekId =
    (peekWeekId && weeks.some((week) => week.id === peekWeekId) && peekWeekId) ||
    (atlas?.currentWeekId && weeks.some((week) => week.id === atlas.currentWeekId) && atlas.currentWeekId) ||
    weeks[0]?.id ||
    null;

  if (loading && !atlas) return <p className="atlas-muted">Loading…</p>;
  if (missing || !atlas) {
    return (
      <div className="atlas-drawer">
        <p className="atlas-muted">Not found.</p>
        <Link href="/atlas" className="atlas-back">
          ← Desk
        </Link>
      </div>
    );
  }

  const budget = weeklyBudgetMinutes(atlas.minutesPerSession, atlas.cadence);
  const load = openWeekId
    ? weekLoad(atlas.syllabus, openWeekId, budget)
    : { openRequired: 0, openMinutes: 0, overflowMinutes: 0 };
  const slips = atlas.syllabus.stations.filter((s) => s.weekId === openWeekId);
  const showRetryRest =
    !filing &&
    atlas.status === "draft" &&
    atlas.syllabus.stations.length > 0 &&
    (streamError !== null || atlas.syllabus.weeks.length < atlas.weeksPlanned || atlas.syllabus.thin);

  const handleThin = async () => {
    if (atlas.status === "draft") {
      await regenerate();
      return;
    }
    const next = await fork();
    if (next) router.push(`/atlas/${next.id}`);
  };

  return (
    <div className="atlas-drawer">
      <Link href="/atlas" className="atlas-back">
        ← Desk
      </Link>
      {filing ? <div className="atlas-filing">FILING {atlas.serial}</div> : null}
      {resourcing && !filing ? <div className="atlas-filing is-holdings">SEARCHING HOLDINGS…</div> : null}
      {showRetryRest ? (
        <div className="atlas-retry-bar">
          <span>{streamError ?? "Filing stopped short."}</span>
          <button type="button" onClick={() => void retryRest()}>
            Retry rest
          </button>
        </div>
      ) : null}
      <AtlasCover
        atlas={atlas}
        variant="large"
        onArchive={() => void archive()}
        onRestore={() => void restore()}
        onDrop={atlas.status !== "walking" ? () => void drop().then((ok) => { if (ok) router.push("/atlas"); }) : undefined}
      />
      {atlas.syllabus.thin && !filing ? (
        <div className="atlas-thin">
          <span>Thin syllabus — regenerate?</span>
          <button type="button" onClick={() => void handleThin()}>
            {atlas.status === "draft" ? "Regenerate" : "Fork"}
          </button>
        </div>
      ) : null}
      {atlas.syllabus.weeks.length > 0 ? (
        <>
          <AtlasWeekTabs
            weeks={atlas.syllabus.weeks}
            stations={atlas.syllabus.stations}
            openWeekId={openWeekId}
            pinnedWeekId={atlas.currentWeekId}
            onPeek={setPeekWeekId}
            onPin={(weekId) => void pinWeek(weekId)}
          />
          <p className={`atlas-load${load.overflowMinutes > 0 ? " is-over" : ""}`}>
            {loadLine(load.openRequired, load.openMinutes, load.overflowMinutes)}
          </p>
          <div className="atlas-slips">
            {slips.map((station) => (
              <AtlasStation
                key={station.id}
                station={station}
                onToggle={() => void toggle(station.id)}
                onSaveNote={(note) => void setNote(station.id, note)}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="atlas-muted">{filing ? "Filing weeks…" : "No weeks filed yet."}</p>
      )}
    </div>
  );
}
