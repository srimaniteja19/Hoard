"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import {
  Plus,
  Lightbulb,
  Sparkles,
  ExternalLink,
  BookOpen,
  Archive,
  RotateCcw,
  Zap,
  ShieldCheck,
  Check,
} from "lucide-react";

import { TilItem } from "@/components/til/TilFeedItem";
import { GlimpseSummaryLink } from "@/components/GlimpseSummaryLink";
import { findLocalSynapseCandidates } from "@/lib/synapse/synapseTrail";

interface InspectorDrawerProps {
  bookmark: Bookmark | null;
  allBookmarks?: Bookmark[];
  collections: Collection[];
  onClose: () => void;
  onToggleRead: (id: number) => void;
  onUpdateNote: (id: number, note: string) => void;
  onChangeCollection: (id: number, targetCollId: string) => void;
  onChangeKind?: (id: number, targetKind: KindType) => void;
  onChangeTag?: (id: number, tag: string) => void;
  onAddChapter?: (
    parentId: number,
    chap: { t: string; mins: number; url: string; startTimeSec?: number }
  ) => Promise<void>;
  onCheckDrift?: (id: number) => Promise<void>;
  onOpenDiff?: (b: Bookmark) => void;
  onSelectBookmark?: (id: number) => void;
  onRecordUse?: (id: number) => void;
  onOpenGhostReader?: (bookmark: Bookmark) => void;
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
  onChangeTag,
  onAddChapter,
  onCheckDrift,
  onOpenDiff,
  onSelectBookmark,
  onRecordUse,
  onOpenGhostReader,
}) => {
  const [noteVal, setNoteVal] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [editingTag, setEditingTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [showAddChap, setShowAddChap] = useState(false);
  const [chapTitle, setChapTitle] = useState("");
  const [chapSec, setChapSec] = useState(0);

  const [dischargedTils, setDischargedTils] = useState<TilItem[]>([]);

  const [prevBookmarkId, setPrevBookmarkId] = useState(bookmark?.id ?? null);
  if ((bookmark?.id ?? null) !== prevBookmarkId) {
    setPrevBookmarkId(bookmark?.id ?? null);
    setNoteVal(bookmark?.note === "Saved via HOARD Extension" ? "" : bookmark?.note || "");
    setShowAddChap(false);
    setEditingTag(false);
    setCustomTagInput("");
    setSuggestedTags([]);
    setIsVerifying(false);
    if (!bookmark) setDischargedTils([]);
  }

  useEffect(() => {
    if (!bookmark) return;
    const query = `${bookmark.t} ${bookmark.note || ""}`.trim();
    if (!query) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggest-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            title: bookmark.t,
            content: bookmark.note,
            topK: 4,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tags)) setSuggestedTags(data.tags);
        }
      } catch {}
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bookmark]);

  useEffect(() => {
    if (bookmark) {
      fetch(`/api/bookmarks/${bookmark.id}/tils`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => setDischargedTils(data.items || []))
        .catch(() => setDischargedTils([]));
    }
  }, [bookmark]);

  const relatedBookmarks: { bookmark: Bookmark; reason: string }[] = (() => {
    if (!bookmark || !allBookmarks.length) return [];
    const candidates = findLocalSynapseCandidates(bookmark, allBookmarks);
    if (candidates.length > 0) {
      const items: { bookmark: Bookmark; reason: string }[] = [];
      for (const c of candidates) {
        const bm = allBookmarks.find((b) => String(b.id) === c.id.replace("bookmark-", ""));
        if (bm) items.push({ bookmark: bm, reason: c.connectionType });
        if (items.length >= 4) break;
      }
      return items;
    }
    return allBookmarks
      .filter((b) => b.id !== bookmark.id && !b.parentId && !b.isDeleted)
      .filter((b) => b.tag === bookmark.tag)
      .slice(0, 3)
      .map((b) => ({ bookmark: b, reason: `#${b.tag}` }));
  })();

  const childChapters =
    bookmark && allBookmarks.length
      ? allBookmarks.filter((b) => b.parentId === bookmark.id)
      : [];

  if (!bookmark) {
    return <aside className="insp" aria-hidden="true" />;
  }

  const typeMeta = TYPES[bookmark.ty] || {
    name: bookmark.ty,
    c: "var(--cyan)",
    fg: "#000",
    verb: "READ",
  };

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
      mins: bookmark.mins || 5,
      url: chapUrl,
      startTimeSec: chapSec,
    });

    setChapTitle("");
    setShowAddChap(false);
  };

  const handleVerifyLink = async () => {
    if (!onCheckDrift || isVerifying) return;
    setIsVerifying(true);
    try {
      await onCheckDrift(bookmark.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const showChaptersSection = bookmark.ty === "VID" || childChapters.length > 0;

  return (
    <>
      <div className="insp-backdrop on" onClick={onClose} />
      <aside className="insp on" aria-label="Bookmark Inspector">
        <div
          className="icover"
          style={{
            background: typeMeta.c,
            color: typeMeta.fg,
            height: "84px",
          }}
        >
          <button type="button" className="iclose" onClick={onClose} aria-label="Close inspector">
            ✕
          </button>
          <span className="tybadge" style={{ fontSize: "11px" }}>
            {typeMeta.name.toUpperCase()}
          </span>
          {bookmark.isQuote && (
            <span className="quote-badge" style={{ fontSize: "11px" }}>
              QUOTE
            </span>
          )}
        </div>

        <div className="ibody">
          <h2 className="ih">{bookmark.t}</h2>
          <div className="iurl">{bookmark.url}</div>

          {/* Primary Actions */}
          <div className="iacts">
            <button
              type="button"
              className="p1"
              onClick={() => {
                window.open(bookmark.url, "_blank", "noopener,noreferrer");
                onRecordUse?.(bookmark.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <ExternalLink size={12} /> OPEN LINK
            </button>

            {onOpenGhostReader && (
              <button
                type="button"
                className="p1"
                style={{
                  background: "var(--yel)",
                  color: "#000",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                onClick={() => onOpenGhostReader(bookmark)}
                title="Read in distraction-free Ghost Reader"
              >
                <BookOpen size={12} /> GHOST READER
              </button>
            )}

            <button
              type="button"
              className="p2"
              onClick={() => onToggleRead(bookmark.id)}
              title="Move to Archive Vault or restore to active shelf"
              style={{
                gridColumn: "1 / -1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {bookmark.unread ? (
                <>
                  <Archive size={12} /> MOVE TO VAULT (MARK READ)
                </>
              ) : (
                <>
                  <RotateCcw size={12} /> RESTORE FROM VAULT
                </>
              )}
            </button>

            <GlimpseSummaryLink url={bookmark.url} variant="button" />
          </div>

          {/* Personal Note */}
          <div className="fld" style={{ marginTop: "16px" }}>
            <span className="flbl" style={{ fontSize: "11px" }}>
              PERSONAL NOTE
            </span>
            <textarea
              className="notebox"
              value={noteVal}
              onChange={handleNoteChange}
              placeholder="Add key takeaways, context, or why you saved this..."
            />
          </div>

          {/* Collection & Tag Organization */}
          <div className="fld">
            <span className="flbl" style={{ fontSize: "11px" }}>
              COLLECTION & TAG
            </span>
            <div style={{ display: "grid", gap: "10px" }}>
              <select
                value={bookmark.coll}
                onChange={(e) => onChangeCollection(bookmark.id, e.target.value)}
                aria-label="Collection folder"
                style={{
                  width: "100%",
                  border: "2px solid var(--ink)",
                  background: "var(--paper)",
                  padding: "7px 8px",
                  fontFamily: "var(--mono)",
                  fontSize: "11.5px",
                  fontWeight: 700,
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

              <div className="ctags" style={{ flexWrap: "wrap", gap: "6px", marginTop: 0 }}>
                <span
                  className="ctag"
                  style={{ background: typeMeta.c, color: typeMeta.fg, fontSize: "11px" }}
                >
                  #{bookmark.tag}
                </span>
                {editingTag ? (
                  <div style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customTagInput.trim() && onChangeTag) {
                          e.preventDefault();
                          onChangeTag(bookmark.id, customTagInput.trim());
                          setEditingTag(false);
                          setCustomTagInput("");
                        } else if (e.key === "Escape") {
                          setEditingTag(false);
                        }
                      }}
                      placeholder="tag + Enter"
                      autoFocus
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        padding: "2px 6px",
                        border: "1.5px solid var(--ink)",
                        width: "100px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customTagInput.trim() && onChangeTag) {
                          onChangeTag(bookmark.id, customTagInput.trim());
                        }
                        setEditingTag(false);
                        setCustomTagInput("");
                      }}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "2px 7px",
                        border: "1.5px solid var(--ink)",
                        background: "var(--ink)",
                        color: "var(--paper)",
                        cursor: "pointer",
                      }}
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ctag"
                    onClick={() => setEditingTag(true)}
                    style={{
                      background: "var(--paper)",
                      color: "var(--fg)",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    + CHANGE TAG
                  </button>
                )}
              </div>

              {suggestedTags.filter((st) => st.toLowerCase() !== bookmark.tag?.toLowerCase())
                .length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      fontWeight: 800,
                      opacity: 0.68,
                    }}
                  >
                    SUGGESTED:
                  </span>
                  {suggestedTags
                    .filter((st) => st.toLowerCase() !== bookmark.tag?.toLowerCase())
                    .map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onChangeTag?.(bookmark.id, st)}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          border: "1px solid var(--ink)",
                          background: "var(--cream)",
                          color: "var(--ink)",
                          cursor: "pointer",
                        }}
                      >
                        #{st}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Metadata Details */}
          <div className="fld">
            <span className="flbl" style={{ fontSize: "11px" }}>
              METADATA
            </span>
            <div className="kvs">
              <div className="kv">
                <dt style={{ fontSize: "11px" }}>KIND</dt>
                <dd>
                  <select
                    value={bookmark.ty}
                    onChange={(e) =>
                      onChangeKind && onChangeKind(bookmark.id, e.target.value as KindType)
                    }
                    aria-label="Content kind"
                    style={{
                      border: "1px solid var(--ink)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      padding: "2px 4px",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <option value="ART">Article</option>
                    <option value="VID">Video</option>
                    <option value="PLY">Playlist</option>
                    <option value="GIT">GitHub Repo</option>
                    <option value="APP">App / Tool</option>
                    <option value="PPR">Paper</option>
                    <option value="DOC">Docs</option>
                  </select>
                </dd>
              </div>
              <div className="kv">
                <dt style={{ fontSize: "11px" }}>USAGE</dt>
                <dd>{bookmark.useCount ?? 0}× OPENED</dd>
              </div>
              <div className="kv">
                <dt style={{ fontSize: "11px" }}>DOMAIN</dt>
                <dd>{bookmark.src}</dd>
              </div>
              <div className="kv">
                <dt style={{ fontSize: "11px" }}>SAVED</dt>
                <dd>{bookmark.when}</dd>
              </div>
            </div>
          </div>

          {/* Video / Existing Chapters Only */}
          {showChaptersSection && (
            <div className="fld">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span className="flbl" style={{ marginBottom: 0, fontSize: "11px" }}>
                  VIDEO CHAPTERS
                </span>
                {onAddChapter && (
                  <button
                    type="button"
                    onClick={() => setShowAddChap(!showAddChap)}
                    style={{
                      background: "var(--paper)",
                      border: "1.5px solid var(--ink)",
                      padding: "2px 7px",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Plus size={11} /> CHAPTER
                  </button>
                )}
              </div>

              {childChapters.length > 0 && (
                <div style={{ display: "grid", gap: "5px" }}>
                  {childChapters.map((chap) => (
                    <div
                      key={chap.id}
                      style={{
                        border: "1.5px solid var(--ink)",
                        background: chap.unread ? "var(--paper)" : "var(--cream)",
                        padding: "6px 8px",
                        fontSize: "11px",
                        fontFamily: "var(--mono)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Zap size={11} /> {chap.t}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          window.open(chap.url, "_blank", "noopener,noreferrer");
                          onRecordUse?.(chap.id);
                        }}
                        style={{
                          background: "var(--yel)",
                          border: "1px solid var(--ink)",
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        OPEN ↗
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddChap && (
                <form
                  onSubmit={handleCreateChapter}
                  style={{
                    marginTop: "8px",
                    background: "var(--paper)",
                    border: "1.5px solid var(--ink)",
                    padding: "8px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Chapter title"
                    value={chapTitle}
                    onChange={(e) => setChapTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "5px",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      border: "1px solid var(--ink)",
                      marginBottom: "6px",
                    }}
                    required
                  />
                  <input
                    type="number"
                    value={chapSec}
                    onChange={(e) => setChapSec(Number(e.target.value))}
                    placeholder="Start seconds (e.g. 1420)"
                    style={{
                      width: "100%",
                      padding: "5px",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      border: "1px solid var(--ink)",
                      marginBottom: "6px",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "var(--yel)",
                      border: "1.5px solid var(--ink)",
                      padding: "5px 10px",
                      fontWeight: 800,
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    SAVE CHAPTER
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Offline Snapshot & Drift Check */}
          <div className="fld">
            <span className="flbl" style={{ fontSize: "11px" }}>
              SNAPSHOT & LINK HEALTH
            </span>
            <div
              style={{
                background: "var(--cream)",
                border: "1.5px solid var(--ink)",
                padding: "10px",
                fontFamily: "var(--mono)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  STATUS:{" "}
                  {bookmark.driftStatus === "changed" ? (
                    <>
                      <Zap size={11} /> DRIFT DETECTED
                    </>
                  ) : bookmark.driftStatus === "404_preserved" ? (
                    <>
                      <ShieldCheck size={11} /> 404 PRESERVED
                    </>
                  ) : (
                    <>
                      <Check size={11} /> ACTIVE
                    </>
                  )}
                </span>
                {bookmark.driftPercent ? <span>{bookmark.driftPercent}% DIFF</span> : null}
              </div>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {onCheckDrift && (
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifyLink}
                    style={{
                      background: "var(--paper)",
                      border: "1.5px solid var(--ink)",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: isVerifying ? "wait" : "pointer",
                      opacity: isVerifying ? 0.65 : 1,
                    }}
                  >
                    {isVerifying ? "VERIFYING..." : "VERIFY LINK"}
                  </button>
                )}

                {onOpenDiff && (
                  <button
                    type="button"
                    onClick={() => onOpenDiff(bookmark)}
                    style={{
                      background: "var(--paper)",
                      border: "1.5px solid var(--ink)",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    VIEW SNAPSHOT / DIFF
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Connected Bookmarks */}
          {relatedBookmarks.length > 0 && (
            <div className="fld">
              <span
                className="flbl"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
              >
                <Sparkles size={11} /> RELATED IN YOUR LIBRARY
              </span>
              <div style={{ display: "grid", gap: "5px" }}>
                {relatedBookmarks.map(({ bookmark: rec, reason }) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectBookmark?.(rec.id)}
                    style={{
                      background: "var(--cream)",
                      border: "1.5px solid color-mix(in oklab, var(--ink) 30%, transparent)",
                      padding: "6px 8px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {rec.t}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        opacity: 0.68,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {reason}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TIL Backlinks */}
          {dischargedTils.length > 0 && (
            <div className="fld">
              <span
                className="flbl"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
              >
                <Lightbulb size={11} /> LINKED TIL NOTES ({dischargedTils.length})
              </span>
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
                      background: "var(--cream)",
                      border: "1.5px solid var(--ink)",
                      padding: "6px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 800,
                        marginBottom: "2px",
                      }}
                    >
                      <span>{til.type}</span>
                      <span>#{til.shortHash}</span>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        opacity: 0.85,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {til.body || til.code || "TIL Entry"}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
