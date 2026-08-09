"use client";

import React from "react";
import { Bookmark } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { Layers, ShieldCheck, AlertTriangle, Zap } from "lucide-react";

interface BookmarkCardProps {
  bookmark: Bookmark;
  isSelected: boolean;
  heightClass?: "tall" | "short" | "";
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  isSelected,
  heightClass = "",
  onToggleSelect,
  onOpen,
  onOpenDiff,
}) => {
  const typeMeta = TYPES[bookmark.ty] || { name: bookmark.ty, c: "#00F0FF", fg: "#000", verb: "READ" };
  const e = bookmark.ex || {};
  const durationText =
    e.Runtime || (e.Stars ? `${e.Stars}★` : e.Pages || e.Platform || (e.Words ? `${e.Words}w` : ""));

  const formatMins = (m: number) => {
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  const handleClick = (evt: React.MouseEvent) => {
    if (evt.metaKey || evt.ctrlKey) {
      onToggleSelect(bookmark.id, evt);
    } else {
      onOpen(bookmark.id);
    }
  };

  const is404 = bookmark.driftStatus === "404_preserved";
  const isChanged = bookmark.driftStatus === "changed";

  return (
    <article
      className={`card ${isSelected ? "sel" : ""}`}
      onClick={handleClick}
      style={{ position: "relative" }}
    >
      <div
        className={`cover ${heightClass}`}
        style={{ background: typeMeta.c }}
      >
        <span
          className="chk"
          onClick={(evt) => {
            evt.stopPropagation();
            onToggleSelect(bookmark.id, evt);
          }}
        >
          {isSelected ? "✕" : ""}
        </span>
        <span className="tybadge">{bookmark.ty}</span>
        {durationText && <span className="dur">{durationText}</span>}
      </div>

      <div className="cbody">
        {/* Parent Chapter Badge */}
        {bookmark.parentTitle && (
          <div
            style={{
              background: "#FFE600",
              border: "1px solid #000",
              padding: "1px 6px",
              fontSize: "10px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "6px",
              fontFamily: "var(--mono)",
            }}
          >
            <Zap size={10} /> CHAPTER: {bookmark.parentTitle.slice(0, 30)}...
          </div>
        )}

        {/* Cluster Badge */}
        {bookmark.clusterTitle && (
          <div
            style={{
              background: "#7C4DFF",
              color: "#fff",
              border: "1px solid #000",
              padding: "1px 6px",
              fontSize: "10px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "6px",
              fontFamily: "var(--mono)",
            }}
          >
            <Layers size={10} /> CLUSTER: {bookmark.clusterTitle}
          </div>
        )}

        <div className="ct">{bookmark.t}</div>
        {bookmark.note && <p className="cex">{bookmark.note}</p>}
        
        <div className="cmeta">
          <span>{bookmark.src}</span>
          <span>·</span>
          <span>
            {typeMeta.verb} {formatMins(bookmark.mins)}
          </span>
        </div>

        {/* Drift & Badges Row */}
        <div className="ctags" style={{ flexWrap: "wrap", gap: "4px" }}>
          <span className="ctag" style={{ background: typeMeta.c }}>
            #{bookmark.tag}
          </span>

          {bookmark.unread && (
            <span className="ctag" style={{ background: "#FF007A", color: "#fff" }}>
              UNREAD
            </span>
          )}

          {isChanged && (
            <span
              className="ctag"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDiff) onOpenDiff(bookmark);
              }}
              style={{ background: "#FFE600", color: "#000", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
              title="Click to view rendered text diff"
            >
              <AlertTriangle size={10} /> DRIFT &gt;{bookmark.driftPercent || 15}%
            </span>
          )}

          {is404 && (
            <span
              className="ctag"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDiff) onOpenDiff(bookmark);
              }}
              style={{ background: "#FF007A", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
              title="Click to view preserved copy"
            >
              <ShieldCheck size={10} /> 404 PRESERVED
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
