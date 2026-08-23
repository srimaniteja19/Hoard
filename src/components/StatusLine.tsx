"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bookmark } from "@/types";

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
    const unread = bookmarks.filter((b) => !b.isDeleted && b.unread);
    const read = bookmarks.filter((b) => !b.isDeleted && !b.unread);

    const mostRecentCreatedAt = bookmarks.reduce<number | null>((latest, b) => {
      if (!b.createdAt) return latest;
      const t = new Date(b.createdAt).getTime();
      if (Number.isNaN(t)) return latest;
      return latest === null || t > latest ? t : latest;
    }, null);
    const lastSaveAgoMins = mostRecentCreatedAt !== null ? (now - mostRecentCreatedAt) / 60000 : null;

    return {
      unreadCount: unread.length,
      readCount: read.length,
      lastSaveAgoMins,
    };
  }, [bookmarks, now]);

  if (!stats) return null;

  return (
    <div className="status-line-bar" role="status">
      <span>{stats.unreadCount} UNREAD</span>
      <span className="sep">·</span>
      <span>{stats.readCount} COMPLETED</span>
      {stats.lastSaveAgoMins !== null && (
        <>
          <span className="sep">·</span>
          <span>LAST SAVE {formatAgo(stats.lastSaveAgoMins)}</span>
        </>
      )}
    </div>
  );
};
