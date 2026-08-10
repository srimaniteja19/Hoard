"use client";

import React, { useMemo } from "react";
import { Bookmark } from "@/types";

interface StatusLineProps {
  bookmarks: Bookmark[];
  coll: string;
  ty: string | null;
  tag: string | null;
  unreadOnly: boolean;
  searchQuery?: string;
}

export const StatusLine: React.FC<StatusLineProps> = ({
  bookmarks,
  coll,
  ty,
  tag,
  unreadOnly,
  searchQuery,
}) => {
  const total = bookmarks.length;
  const unread = useMemo(() => bookmarks.filter((b) => b.unread).length, [bookmarks]);

  const queuedMins = useMemo(() => {
    return bookmarks.reduce((acc, b) => acc + (b.unread ? b.mins || 0 : 0), 0);
  }, [bookmarks]);

  const formatQueuedTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (coll !== "all") count++;
    if (ty) count++;
    if (tag) count++;
    if (unreadOnly) count++;
    if (searchQuery && searchQuery.trim().length > 0) count++;
    return count;
  }, [coll, ty, tag, unreadOnly, searchQuery]);

  return (
    <div
      className="status-line-bar"
      style={{
        fontFamily: "var(--mono)",
        fontSize: "10.5px",
        fontWeight: 800,
        letterSpacing: "0.06em",
        padding: "6px 14px",
        margin: "0 0 16px 0",
        background: "var(--paper)",
        border: "var(--bd)",
        color: "var(--fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "var(--sh-sm)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span>TOTAL {total} ITEMS</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{unread} UNREAD</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{formatQueuedTime(queuedMins)} QUEUED</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{activeFiltersCount} ACTIVE FILTERS</span>
      </div>

      <div style={{ fontSize: "9px", opacity: 0.7 }}>
        [HOARD V2 STATUS]
      </div>
    </div>
  );
};
