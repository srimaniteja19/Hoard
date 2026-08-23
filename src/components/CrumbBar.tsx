"use client";

import React, { useMemo } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { ArrowLeft } from "lucide-react";

interface CrumbBarProps {
  items: Bookmark[];
  collections?: Collection[];
  coll: string;
  ty: KindType | null;
  tag?: string | null;
  activeTopicCluster?: string | null;
  onReset?: () => void;
}

export const CrumbBar: React.FC<CrumbBarProps> = ({
  items,
  collections = [],
  coll,
  ty,
  tag,
  activeTopicCluster,
  onReset,
}) => {
  const uniqueKinds = useMemo(() => {
    return new Set(items.map((b) => b.ty)).size;
  }, [items]);

  const isFiltered = ty !== null || coll !== "all" || Boolean(tag) || Boolean(activeTopicCluster);

  const titleText = useMemo(() => {
    if (activeTopicCluster) return `TOPIC: ${activeTopicCluster.toUpperCase()}`;
    if (ty) return TYPES[ty]?.name.toUpperCase() || ty;
    if (tag) return `#${tag.toUpperCase()}`;
    const flatten = (list: Collection[]): Collection[] => {
      let acc: Collection[] = [];
      list.forEach((c) => {
        acc.push(c);
        if (c.kids) acc = acc.concat(flatten(c.kids));
      });
      return acc;
    };
    const allColls = flatten(collections);
    const found = allColls.find((c) => c.id === coll);
    return (found?.name || "ALL BOOKMARKS").toUpperCase();
  }, [coll, ty, tag, activeTopicCluster, collections]);

  return (
    <div className="crumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <h1>
          <span className="hl">{titleText}</span>
        </h1>
        {isFiltered && onReset && (
          <button
            onClick={onReset}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              border: "2px solid var(--ink)",
              background: "#B6FF3C",
              color: "#000",
              padding: "4px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "2px 2px 0 var(--ink)",
            }}
            title="Reset filters and view all bookmarks in shelf"
          >
            <ArrowLeft size={12} strokeWidth={3} /> ALL BOOKMARKS
          </button>
        )}
      </div>

      <div className="stats">
        <span className="stat">
          <b>{items.length}</b> ITEMS
        </span>
        <span className="stat desktop-only-stat">
          <b>{uniqueKinds}</b> KINDS
        </span>
      </div>
    </div>
  );
};
