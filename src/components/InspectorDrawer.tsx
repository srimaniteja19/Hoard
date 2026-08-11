"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { Plus, Lightbulb } from "lucide-react";

import { TilItem } from "@/components/til/TilFeedItem";

interface InspectorDrawerProps {
  bookmark: Bookmark | null;
  allBookmarks?: Bookmark[];
  collections: Collection[];
  onClose: () => void;
  onToggleRead: (id: number) => void;
  onUpdateNote: (id: number, note: string) => void;
  onChangeCollection: (id: number, targetCollId: string) => void;
  onChangeKind?: (id: number, targetKind: KindType) => void;
  onAddChapter?: (parentId: number, chap: { t: string; mins: number; url: string; startTimeSec?: number }) => Promise<void>;
  onCheckDrift?: (id: number) => Promise<void>;
  onOpenDiff?: (b: Bookmark) => void;
  onSelectBookmark?: (id: number) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  bookmark,
  allBookmarks = [],
  collections,
  onClose,
  onToggleRead,
  onUpdateNote,
  onChangeCollection,
  onChangeKind,
  onAddChapter,
  onCheckDrift,
  onOpenDiff,
  onSelectBookmark,
}) => {
  const [noteVal, setNoteVal] = useState("");
  const [permCopy, setPermCopy] = useState(true);
  const [notifyBreak, setNotifyBreak] = useState(false);
  const [pinned, setPinned] = useState(false);

  // New chapter form state
  const [showAddChap, setShowAddChap] = useState(false);
  const [chapTitle, setChapTitle] = useState("");
  const [chapMins, setChapMins] = useState(10);
  const [chapSec, setChapSec] = useState(0);

  const [dischargedTils, setDischargedTils] = useState<TilItem[]>([]);

  // Sync noteVal from the bookmark prop when it changes (adjusting state during
  // render, per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevBookmarkId, setPrevBookmarkId] = useState(bookmark?.id ?? null);
  if ((bookmark?.id ?? null) !== prevBookmarkId) {
    setPrevBookmarkId(bookmark?.id ?? null);
    setNoteVal(bookmark?.note || "");
    setShowAddChap(false);
    if (!bookmark) setDischargedTils([]);
  }

  useEffect(() => {
    if (bookmark) {
      fetch(`/api/bookmarks/${bookmark.id}/tils`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => setDischargedTils(data.items || []))
        .catch(() => setDischargedTils([]));
    }
  }, [bookmark]);

  // "From Your Archive" recommendations algorithm (nearest-neighbor on tag / keywords)
  const archivedRecommendations = useMemo(() => {
    if (!bookmark || !allBookmarks.length) return [];
    return allBookmarks
      .filter((b) => b.id !== bookmark.id && !b.parentId)
      .filter((b) => b.tag === bookmark.tag || b.ty === bookmark.ty)
      .slice(0, 3);
  }, [bookmark, allBookmarks]);

  // Child chapters of this bookmark
  const childChapters = useMemo(() => {
    if (!bookmark || !allBookmarks.length) return [];
    return allBookmarks.filter((b) => b.parentId === bookmark.id);
  }, [bookmark, allBookmarks]);

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

  const typeMeta = TYPES[bookmark.ty] || { name: bookmark.ty, c: "#00F0FF", fg: "#000", verb: "READ" };

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

  const handleCreateChapter = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!chapTitle.trim() || !onAddChapter) return;
    const timeParam = chapSec > 0 ? `?t=${chapSec}` : "";
    const chapUrl = bookmark.url.includes("?")
      ? `${bookmark.url}&t=${chapSec}`
      : `${bookmark.url}${timeParam}`;

    await onAddChapter(bookmark.id, {
      t: chapTitle.trim(),
      mins: chapMins,
      url: chapUrl,
      startTimeSec: chapSec,
    });

    setChapTitle("");
    setShowAddChap(false);
  };

  return (
    <>
      <div
        className={`insp-backdrop ${bookmark ? "on" : ""}`}
        onClick={onClose}
      />
      <aside className={`insp ${bookmark ? "on" : ""}`}>
        <div className="icover" style={{ background: typeMeta.c, color: typeMeta.fg }}>
          <button className="iclose" onClick={onClose} aria-label="Close inspector">
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

          {/* 💡 FROM YOUR ARCHIVE Strip */}
          {archivedRecommendations.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                background: "var(--cream)",
                border: "var(--bd)",
                boxShadow: "var(--sh-sm)",
                padding: "12px",
                fontFamily: "var(--mono)",
                color: "var(--fg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "11px", marginBottom: "6px" }}>
                <Lightbulb size={14} color="var(--fg)" /> FROM YOUR ARCHIVE:
              </div>
              <div style={{ fontSize: "11px", color: "var(--fg)", opacity: 0.65, marginBottom: "8px" }}>
                You previously saved these items about #{bookmark.tag}:
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {archivedRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => onSelectBookmark && onSelectBookmark(rec.id)}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--fg)",
                      color: "var(--fg)",
                      padding: "6px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "80%" }}>
                      {rec.t}
                    </span>
                    <span style={{ fontSize: "9px", opacity: 0.7 }}>{rec.when}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAPTERS & SECTIONS BREAKDOWN */}
          <div className="fld" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="flbl">CHAPTERS & SECTIONS</span>
              {onAddChapter && (
                <button
                  onClick={() => setShowAddChap(!showAddChap)}
                  style={{
                    background: "#B6FF3C",
                    border: "1px solid #000",
                    padding: "2px 6px",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <Plus size={12} /> ADD CHAPTER
                </button>
              )}
            </div>

            {/* Child chapters list */}
            {childChapters.length > 0 ? (
              <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
                {childChapters.map((chap) => (
                  <div
                    key={chap.id}
                    style={{
                      border: "1.5px solid #000",
                      background: chap.unread ? "#FFF" : "#F0F0F0",
                      padding: "8px 10px",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>⚡ {chap.t}</div>
                      <div style={{ fontSize: "10px", color: "#666" }}>{chap.mins} min chapter</div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => window.open(chap.url, "_blank")}
                        style={{
                          background: "#00F0FF",
                          border: "1px solid #000",
                          padding: "2px 6px",
                          fontSize: "9px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        DEEP LINK ↗
                      </button>
                      <button
                        onClick={() => onToggleRead(chap.id)}
                        style={{
                          background: chap.unread ? "#FF007A" : "#B6FF3C",
                          color: chap.unread ? "#fff" : "#000",
                          border: "1px solid #000",
                          padding: "2px 6px",
                          fontSize: "9px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {chap.unread ? "DONE" : "READ"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "#777", fontStyle: "italic", marginTop: "6px" }}>
                No chapters added yet. Decompose long videos or papers into checkable sub-items.
              </div>
            )}

            {/* Add Chapter Form */}
            {showAddChap && (
              <form onSubmit={handleCreateChapter} style={{ marginTop: "10px", background: "#FFFDF8", border: "2px solid #000", padding: "10px" }}>
                <input
                  type="text"
                  placeholder="Chapter title (e.g. Chapter 3: Self-Attention)"
                  value={chapTitle}
                  onChange={(e) => setChapTitle(e.target.value)}
                  style={{ width: "100%", padding: "6px", fontSize: "11px", fontFamily: "var(--mono)", border: "1.5px solid #000", marginBottom: "8px" }}
                  required
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div>
                    <label style={{ fontSize: "9px", fontWeight: 800 }}>ESTIMATED MINS</label>
                    <input
                      type="number"
                      value={chapMins}
                      onChange={(e) => setChapMins(Number(e.target.value))}
                      style={{ width: "100%", padding: "4px", fontSize: "11px", fontFamily: "var(--mono)", border: "1.5px solid #000" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "9px", fontWeight: 800 }}>START SEC (OPTIONAL)</label>
                    <input
                      type="number"
                      value={chapSec}
                      onChange={(e) => setChapSec(Number(e.target.value))}
                      placeholder="e.g. 1420 for ?t=1420"
                      style={{ width: "100%", padding: "4px", fontSize: "11px", fontFamily: "var(--mono)", border: "1.5px solid #000" }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  style={{ background: "#B6FF3C", border: "2px solid #000", padding: "4px 12px", fontWeight: 800, fontSize: "11px", cursor: "pointer", width: "100%" }}
                >
                  SAVE CHAPTER ITEM
                </button>
              </form>
            )}
          </div>

          {/* CONTENT DRIFT & LINK ROT SECTION */}
          <div className="fld">
            <span className="flbl">CONTENT DRIFT & LINK ROT</span>
            <div style={{ background: "var(--paper)", border: "var(--bd)", color: "var(--fg)", padding: "12px", fontFamily: "var(--mono)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800 }}>
                  STATUS: {bookmark.driftStatus === "changed" ? "⚡ DRIFT DETECTED" : bookmark.driftStatus === "404_preserved" ? "🛡️ 404 PRESERVED" : "CLEAN"}
                </span>
                {bookmark.driftPercent ? (
                  <span style={{ fontSize: "10px", fontWeight: 800, background: "#FFE600", color: "#000", padding: "1px 5px", border: "1px solid #000" }}>
                    {bookmark.driftPercent}% CHANGE
                  </span>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {onCheckDrift && (
                  <button
                    onClick={() => onCheckDrift(bookmark.id)}
                    style={{
                      background: "#FFE600",
                      border: "1.5px solid #000",
                      padding: "4px 10px",
                      fontSize: "10px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    CHECK FOR DRIFT
                  </button>
                )}

                {onOpenDiff && (
                  <button
                    onClick={() => onOpenDiff(bookmark)}
                    style={{
                      background: "#00F0FF",
                      border: "1.5px solid #000",
                      padding: "4px 10px",
                      fontSize: "10px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    VIEW ARCHIVED TEXT / DIFF
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="fld">
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
                <dt>KIND / TYPE</dt>
                <dd>
                  <select
                    value={bookmark.ty}
                    onChange={(e) => onChangeKind && onChangeKind(bookmark.id, e.target.value as KindType)}
                    style={{
                      border: "1.5px solid #000",
                      background: typeMeta.c,
                      color: typeMeta.fg,
                      padding: "2px 6px",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="ART">ART — Article / Post</option>
                    <option value="VID">VID — Video</option>
                    <option value="PLY">PLY — Playlist / Audio</option>
                    <option value="GIT">GIT — Code Repo</option>
                    <option value="APP">APP — Tool / Application</option>
                    <option value="PPR">PPR — Research Paper</option>
                    <option value="DOC">DOC — Documentation</option>
                  </select>
                </dd>
              </div>
              <div className="kv">
                <dt>COST</dt>
                <dd>
                  {typeMeta.verb} {formatMins(bookmark.mins)}
                </dd>
              </div>
              {Object.entries(bookmark.ex || {})
                .filter(([k, v]) => k !== "coverData" && typeof v === "string")
                .map(([k, v]) => (
                <div className="kv" key={k}>
                  <dt>{k.toUpperCase()}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="kv">
                <dt>SOURCE</dt>
                <dd>{bookmark.source || (bookmark.note === "Saved via HOARD Extension" ? "Saved via HOARD Extension" : bookmark.src || "Direct Save")}</dd>
              </div>
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
              <span className="ctag" style={{ background: typeMeta.c, color: typeMeta.fg }}>
                #{bookmark.tag}
              </span>
              <span className="ctag" style={{ background: "var(--paper)", color: "var(--fg)" }}>
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

          {/* 💡 OUTCOME LEDGER / BOOKMARK BACKLINKS */}
          <div className="fld" style={{ marginTop: "16px", background: "var(--paper)", border: "2px solid #000", padding: "12px" }}>
            <span className="flbl" style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Lightbulb size={13} fill="#FFE600" color="#000" /> OUTCOME LEDGER ({dischargedTils.length} TILS CAME OUT OF THIS)
            </span>

            {dischargedTils.length === 0 ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6 }}>
                No TIL entries logged from this bookmark yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {dischargedTils.map((til) => (
                  <a
                    key={til.id}
                    href={`/til#til-${til.shortHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      background: "#FFFDF8",
                      border: "1.5px solid #000",
                      padding: "6px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      display: "block",
                      boxShadow: "2px 2px 0 #000",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, marginBottom: "2px" }}>
                      <span style={{ background: "#00F0FF", color: "#000", padding: "0 4px", fontSize: "9px", border: "1px solid #000" }}>
                        {til.type}
                      </span>
                      <span>#{til.shortHash}</span>
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {til.body || til.code || "TIL Entry"}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
