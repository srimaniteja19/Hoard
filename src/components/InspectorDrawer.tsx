"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Collection } from "@/types";
import { TYPES } from "@/data/initialBookmarks";

interface InspectorDrawerProps {
  bookmark: Bookmark | null;
  collections: Collection[];
  onClose: () => void;
  onToggleRead: (id: number) => void;
  onUpdateNote: (id: number, note: string) => void;
  onChangeCollection: (id: number, targetCollId: string) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  bookmark,
  collections,
  onClose,
  onToggleRead,
  onUpdateNote,
  onChangeCollection,
}) => {
  const [noteVal, setNoteVal] = useState("");
  const [permCopy, setPermCopy] = useState(true);
  const [notifyBreak, setNotifyBreak] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setNoteVal(bookmark.note || "");
    }
  }, [bookmark]);

  if (!bookmark) {
    return (
      <aside className="insp">
        <div className="icover">
          <button className="iclose" onClick={onClose}>
            ✕
          </button>
        </div>
      </aside>
    );
  }

  const typeMeta = TYPES[bookmark.ty];

  const flattenCollections = (list: Collection[], depth = 0): { id: string; name: string }[] => {
    let res: { id: string; name: string }[] = [];
    list.forEach((item) => {
      if (item.id !== "all") {
        const prefix = "— ".repeat(depth);
        res.push({ id: item.id, name: `${prefix}${item.name}` });
      }
      if (item.kids) {
        res = res.concat(flattenCollections(item.kids, depth + 1));
      }
    });
    return res;
  };

  const allFolders = flattenCollections(collections);

  const formatMins = (m: number) => {
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteVal(val);
    onUpdateNote(bookmark.id, val);
  };

  return (
    <aside className={`insp ${bookmark ? "on" : ""}`}>
      <div className="icover" style={{ background: typeMeta.c }}>
        <button className="iclose" onClick={onClose}>
          ✕
        </button>
        <span className="tybadge">{bookmark.ty}</span>
      </div>

      <div className="ibody">
        <h2 className="ih">{bookmark.t}</h2>
        <div className="iurl">{bookmark.url}</div>

        <div className="iacts">
          <button
            className="p1"
            onClick={() => window.open(bookmark.url, "_blank")}
          >
            OPEN ↗
          </button>
          <button
            className="p2"
            onClick={() => onToggleRead(bookmark.id)}
          >
            {bookmark.unread ? "MARK READ" : "MARK UNREAD"}
          </button>
        </div>

        <div className="fld" style={{ marginTop: 16 }}>
          <span className="flbl">MY NOTE</span>
          <textarea
            className="notebox"
            value={noteVal}
            onChange={handleNoteChange}
            placeholder="What's worth remembering about this?"
          />
        </div>

        <div className="fld">
          <span className="flbl">DETAILS</span>
          <div className="kvs">
            <div className="kv">
              <dt>KIND</dt>
              <dd>{typeMeta.name}</dd>
            </div>
            <div className="kv">
              <dt>COST</dt>
              <dd>
                {typeMeta.verb} {formatMins(bookmark.mins)}
              </dd>
            </div>
            {Object.entries(bookmark.ex).map(([k, v]) => (
              <div className="kv" key={k}>
                <dt>{k.toUpperCase()}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="kv">
              <dt>SAVED</dt>
              <dd>{bookmark.when}</dd>
            </div>
          </div>
        </div>

        <div className="fld">
          <span className="flbl">COLLECTION / FOLDER</span>
          <div className="fval">
            <select
              value={bookmark.coll}
              onChange={(e) => onChangeCollection(bookmark.id, e.target.value)}
              style={{
                width: "100%",
                border: "2px solid #000",
                background: "#FFE600",
                padding: "6px 8px",
                fontFamily: "var(--mono)",
                fontSize: "12px",
                fontWeight: "700",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {allFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fld">
          <span className="flbl">TAGS</span>
          <div className="ctags">
            <span className="ctag" style={{ background: typeMeta.c }}>
              #{bookmark.tag}
            </span>
            <span className="ctag" style={{ background: "#fff" }}>
              + ADD
            </span>
          </div>
        </div>

        <div className="fld">
          <span className="flbl">STORAGE</span>
          <div
            className={`toggle ${permCopy ? "on" : ""}`}
            onClick={() => setPermCopy(!permCopy)}
          >
            <span>Permanent copy saved</span>
            <i></i>
          </div>
          <div
            className={`toggle ${notifyBreak ? "on" : ""}`}
            onClick={() => setNotifyBreak(!notifyBreak)}
          >
            <span>Notify if link breaks</span>
            <i></i>
          </div>
          <div
            className={`toggle ${pinned ? "on" : ""}`}
            onClick={() => setPinned(!pinned)}
          >
            <span>Pin to top of collection</span>
            <i></i>
          </div>
        </div>
      </div>
    </aside>
  );
};
