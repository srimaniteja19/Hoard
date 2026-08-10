"use client";

import React, { useMemo } from "react";
import { Bookmark, KindType } from "@/types";
import { COLLS, TYPES } from "@/data/initialBookmarks";

interface CrumbBarProps {
  items: Bookmark[];
  coll: string;
  ty: KindType | null;
}

export const CrumbBar: React.FC<CrumbBarProps> = ({ items, coll, ty }) => {
  const totalMins = useMemo(() => {
    return items.reduce((acc, b) => acc + b.mins, 0);
  }, [items]);

  const uniqueKinds = useMemo(() => {
    return new Set(items.map((b) => b.ty)).size;
  }, [items]);

  const titleText = useMemo(() => {
    if (ty) return TYPES[ty].name.toUpperCase();
    const allColls = COLLS.flatMap((c) => [c, ...(c.kids || [])]);
    const found = allColls.find((c) => c.id === coll);
    return (found?.name || "ALL BOOKMARKS").toUpperCase();
  }, [coll, ty]);

  const formatMins = (m: number) => {
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  return (
    <div className="crumb">
      <h1>
        <span className="hl">{titleText}</span>
      </h1>
      <div className="stats">
        <span className="stat">
          <b>{items.length}</b> ITEMS
        </span>
        <span className="stat desktop-only-stat">
          <b>{uniqueKinds}</b> KINDS
        </span>
        <span
          className="stat"
          style={{
            background: totalMins > 600 ? "#FF007A" : "#B6FF3C",
            color: totalMins > 600 ? "#fff" : "#000",
          }}
        >
          <b>{formatMins(totalMins)}</b> QUEUED
        </span>
      </div>
    </div>
  );
};
