"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bookmark } from "@/types";
import { formatDuration } from "@/lib/format";

interface StatusLineProps {
  bookmarks: Bookmark[];
}

const formatAgo = (mins: number) => {
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${Math.round(mins)}M AGO`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}H AGO`;
  return `${Math.round(hours / 24)}D AGO`;
};

export const StatusLine: React.FC<StatusLineProps> = ({ bookmarks }) => {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Must run post-mount: Date.now() is impure and would embed a stale
    // server-render timestamp if called during render/SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    if (now === null) return null;
    const unread = bookmarks.filter((b) => b.unread);
    const queuedMins = unread.reduce((acc, b) => acc + (b.mins || 0), 0);

    // Approximate "completed" rate: minutes of read items whose last update
    // (a proxy for when they were marked read) falls in the last 28 days.
    const windowMs = 28 * 24 * 60 * 60 * 1000;
    const minutesCompletedLast28Days = bookmarks.reduce((acc, b) => {
      if (b.unread || !b.updatedAt) return acc;
      const updated = new Date(b.updatedAt).getTime();
      if (Number.isNaN(updated) || now - updated > windowMs) return acc;
      return acc + (b.mins || 0);
    }, 0);
    const dailyRate = minutesCompletedLast28Days / 28;
    const burnDownDays = dailyRate > 0 ? Math.ceil(queuedMins / dailyRate) : null;

    const mostRecentCreatedAt = bookmarks.reduce<number | null>((latest, b) => {
      if (!b.createdAt) return latest;
      const t = new Date(b.createdAt).getTime();
      if (Number.isNaN(t)) return latest;
      return latest === null || t > latest ? t : latest;
    }, null);
    const lastSaveAgoMins = mostRecentCreatedAt !== null ? (now - mostRecentCreatedAt) / 60000 : null;

    return {
      itemCount: unread.length,
      queuedMins,
      burnDownDays,
      lastSaveAgoMins,
    };
  }, [bookmarks, now]);

  if (!stats) return null;

  return (
    <div className="status-line-bar" role="status">
      <span>{stats.itemCount} ITEMS</span>
      <span className="sep">·</span>
      <span>{formatDuration(stats.queuedMins)} QUEUED</span>
      <span className="sep">·</span>
      <span>
        {stats.burnDownDays !== null
          ? `BURNS DOWN IN ${stats.burnDownDays} ${stats.burnDownDays === 1 ? "DAY" : "DAYS"} AT CURRENT RATE`
          : "BURN-DOWN RATE UNKNOWN"}
      </span>
      {stats.lastSaveAgoMins !== null && (
        <>
          <span className="sep">·</span>
          <span>LAST SAVE {formatAgo(stats.lastSaveAgoMins)}</span>
        </>
      )}
    </div>
  );
};
