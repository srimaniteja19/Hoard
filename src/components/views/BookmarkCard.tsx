"use client";

import React from "react";
import { Bookmark } from "@/types";
import { TYPES } from "@/data/initialBookmarks";

interface BookmarkCardProps {
  bookmark: Bookmark;
  isSelected: boolean;
  heightClass?: "tall" | "short" | "";
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  isSelected,
  heightClass = "",
  onToggleSelect,
  onOpen,
}) => {
  const typeMeta = TYPES[bookmark.ty];
  const e = bookmark.ex;
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

  return (
    <article
      className={`card ${isSelected ? "sel" : ""}`}
      onClick={handleClick}
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
        <div className="ct">{bookmark.t}</div>
        {bookmark.note && <p className="cex">{bookmark.note}</p>}
        <div className="cmeta">
          <span>{bookmark.src}</span>
          <span>·</span>
          <span>
            {typeMeta.verb} {formatMins(bookmark.mins)}
          </span>
        </div>
        <div className="ctags">
          <span className="ctag" style={{ background: typeMeta.c }}>
            #{bookmark.tag}
          </span>
          {bookmark.unread && (
            <span className="ctag" style={{ background: "#FF007A", color: "#fff" }}>
              UNREAD
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
