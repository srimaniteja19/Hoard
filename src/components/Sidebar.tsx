"use client";

import React, { useMemo } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { inColl } from "@/hooks/useBookmarks";

interface SidebarProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  coll: string;
  setColl: (c: string) => void;
  ty: KindType | null;
  setTy: (t: KindType | null) => void;
  tag: string | null;
  setTag: (t: string | null) => void;
  unreadOnly: boolean;
  setUnreadOnly: (u: boolean) => void;
  onOpenCapture: () => void;
  onOpenNewFolder: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  bookmarks,
  collections,
  coll,
  setColl,
  ty,
  setTy,
  tag,
  setTag,
  unreadOnly,
  setUnreadOnly,
  onOpenCapture,
  onOpenNewFolder,
}) => {
  const cnt = (cId: string) => bookmarks.filter((x) => inColl(x, cId, collections)).length;

  const typeCounts = useMemo(() => {
    const map: Partial<Record<KindType, number>> = {};
    bookmarks.forEach((x) => {
      map[x.ty] = (map[x.ty] || 0) + 1;
    });
    return map;
  }, [bookmarks]);

  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    bookmarks.forEach((x) => {
      if (x.tag) {
        map[x.tag] = (map[x.tag] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const unreadCount = useMemo(() => {
    return bookmarks.filter((x) => x.unread).length;
  }, [bookmarks]);

  const renderCollectionTree = (list: Collection[], depth = 0) => {
    return list.map((c) => (
      <React.Fragment key={c.id}>
        <div
          className={`ci ${depth > 0 ? "child" : ""} ${coll === c.id ? "on" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${14 + depth * 14}px` : undefined }}
          onClick={() => {
            setColl(c.id);
            setTy(null);
          }}
        >
          <span className="ic" style={{ background: c.c }}>
            {c.ic}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </span>
          <span className="n">{cnt(c.id)}</span>
        </div>
        {c.kids && renderCollectionTree(c.kids, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <aside className="side">
      <div className="logo">
        <b>HOARD</b>
        <span>{bookmarks.length}</span>
      </div>

      <button className="addbtn" onClick={onOpenCapture}>
        SAVE A LINK <kbd>⌘N</kbd>
      </button>

      <div className="sidescroll">
        <div className="slbl" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            COLLECTIONS<i></i>
          </div>
          <button
            onClick={onOpenNewFolder}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9px",
              fontWeight: 800,
              border: "2px solid #000",
              background: "#FFE600",
              padding: "2px 6px",
              cursor: "pointer",
              marginLeft: "4px",
            }}
          >
            + FOLDER
          </button>
        </div>
        <div id="colls">{renderCollectionTree(collections)}</div>

        <div className="slbl">
          KIND<i></i>
        </div>
        <div id="kinds">
          {(Object.keys(TYPES) as KindType[]).map((k) => {
            const v = TYPES[k];
            return (
              <div
                key={k}
                className={`ci ${ty === k ? "on" : ""}`}
                onClick={() => setTy(ty === k ? null : k)}
              >
                <span className="ic" style={{ background: v.c }}>
                  {k[0]}
                </span>
                {v.name}
                <span className="n">{typeCounts[k] || 0}</span>
              </div>
            );
          })}
        </div>

        <div className="slbl">
          TAGS<i></i>
        </div>
        <div className="tagwrap" id="tags">
          {tagCounts.map(([t, n]) => (
            <span
              key={t}
              className={`tg ${tag === t ? "on" : ""}`}
              onClick={() => setTag(tag === t ? null : t)}
            >
              #{t} {n}
            </span>
          ))}
        </div>

        <div className="slbl">
          FILTERS<i></i>
        </div>
        <div id="filters">
          <div
            className={`ci ${unreadOnly ? "on" : ""}`}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            <span className="ic" style={{ background: "#FF007A" }}></span>
            Unread only
            <span className="n">{unreadCount}</span>
          </div>
          <div className="ci">
            <span className="ic" style={{ background: "#fff" }}>
              2
            </span>
            Duplicates
            <span className="n">0</span>
          </div>
          <div className="ci">
            <span className="ic" style={{ background: "#fff" }}>
              ✕
            </span>
            Broken links
            <span className="n">3</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
