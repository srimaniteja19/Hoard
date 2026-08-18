"use client";

import React, { useState, useMemo } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import {
  Archive,
  BookOpen,
  FileText,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Download,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Clock,
  Hash,
  Layers,
  Filter,
} from "lucide-react";
import { CoverCanvas } from "@/components/covers/CoverCanvas";
import { formatDuration } from "@/lib/format";

export type ArchiveSubFilter = "all" | "snapshots" | "drift" | "discharged" | "trash";

interface ArchiveViewProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onOpen: (id: number) => void;
  onToggleRead: (id: number) => void;
  onRestore: (id: number) => void;
  onPurge: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  bookmarks,
  collections,
  onOpen,
  onToggleRead,
  onRestore,
  onPurge,
  onOpenDiff,
  onDischarge,
}) => {
  const [subFilter, setSubFilter] = useState<ArchiveSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<KindType | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeReaderBookmark, setActiveReaderBookmark] = useState<Bookmark | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Group / partition datasets
  const archivedReadBookmarks = useMemo(
    () => bookmarks.filter((b) => !b.isDeleted && !b.unread),
    [bookmarks]
  );

  const snapshotBookmarks = useMemo(
    () => bookmarks.filter((b) => !b.isDeleted && Boolean(b.archivedText)),
    [bookmarks]
  );

  const driftBookmarks = useMemo(
    () =>
      bookmarks.filter(
        (b) =>
          !b.isDeleted &&
          (b.driftStatus === "404_preserved" || b.driftStatus === "changed")
      ),
    [bookmarks]
  );

  const dischargedBookmarks = useMemo(
    () =>
      bookmarks.filter(
        (b) => !b.isDeleted && (b.note?.includes("TIL:") || b.note?.includes("discharged") || !b.unread)
      ),
    [bookmarks]
  );

  const trashBookmarks = useMemo(
    () => bookmarks.filter((b) => b.isDeleted),
    [bookmarks]
  );

  // Base list according to sub-filter
  const baseList = useMemo(() => {
    switch (subFilter) {
      case "snapshots":
        return snapshotBookmarks;
      case "drift":
        return driftBookmarks;
      case "discharged":
        return dischargedBookmarks;
      case "trash":
        return trashBookmarks;
      case "all":
      default:
        return archivedReadBookmarks.length > 0 ? archivedReadBookmarks : bookmarks.filter((b) => !b.isDeleted);
    }
  }, [
    subFilter,
    snapshotBookmarks,
    driftBookmarks,
    dischargedBookmarks,
    trashBookmarks,
    archivedReadBookmarks,
    bookmarks,
  ]);

  // Telemetry metrics
  const totalReadMinutes = useMemo(() => {
    return archivedReadBookmarks.reduce((sum, b) => sum + (b.mins || 0), 0);
  }, [archivedReadBookmarks]);

  const totalSnapshotsCount = snapshotBookmarks.length;
  const totalDriftProtected = driftBookmarks.length;

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter((b) => {
      if (selectedKind && b.ty !== selectedKind) return false;
      if (selectedTag && b.tag !== selectedTag) return false;
      if (q) {
        const hay = `${b.t} ${b.src} ${b.tag} ${b.note || ""} ${b.archivedText || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [baseList, selectedKind, selectedTag, searchQuery]);

  // Extract all available tags in this archive view
  const availableTags = useMemo(() => {
    const map: Record<string, number> = {};
    baseList.forEach((b) => {
      if (b.tag) map[b.tag] = (map[b.tag] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [baseList]);

  // Copy snapshot markdown
  const handleCopyMarkdown = (b: Bookmark) => {
    const content = `# ${b.t}\nSource: ${b.url}\nType: ${b.ty} | Tag: #${b.tag}\n\n${b.archivedText || b.note || "No cached text content."}`;
    navigator.clipboard.writeText(content);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export full archive as JSON/Markdown file
  const handleExportCompendium = () => {
    const exportData = filteredItems.map((b) => ({
      id: b.id,
      title: b.t,
      url: b.url,
      type: b.ty,
      tag: b.tag,
      mins: b.mins,
      savedAt: b.createdAt,
      archivedText: b.archivedText || null,
      note: b.note || null,
      driftStatus: b.driftStatus || null,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hoard-archive-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ─── Vault Header Banner ────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                background: "var(--yel)",
                border: "2px solid var(--ink)",
                display: "grid",
                placeItems: "center",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              <Archive size={22} strokeWidth={2.5} color="#000" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--ink)",
                }}
              >
                BOOKMARKS ARCHIVE VAULT
                <span
                  style={{
                    fontSize: "10px",
                    background: "var(--lime)",
                    color: "#000",
                    padding: "2px 6px",
                    border: "1px solid var(--ink)",
                    boxShadow: "1px 1px 0 var(--ink)",
                  }}
                >
                  PRESERVED
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  color: "var(--ink)",
                  opacity: 0.7,
                  marginTop: "2px",
                }}
              >
                Permanent repository of read links, full offline text snapshots, and drift-protected assets.
              </div>
            </div>
          </div>

          {/* Quick Vault Action Buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={handleExportCompendium}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 900,
                background: copiedAll ? "var(--lime)" : "var(--cyan)",
                color: "#000",
                border: "2px solid var(--ink)",
                boxShadow: "2px 2px 0 var(--ink)",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {copiedAll ? <Check size={13} /> : <Download size={13} />}
              {copiedAll ? "EXPORTED!" : "EXPORT VAULT JSON"}
            </button>
          </div>
        </div>

        {/* ─── Vault Telemetry KPI Grid ────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "12px",
            borderTop: "1.5px dashed var(--ink)",
            paddingTop: "14px",
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              ARCHIVED / READ
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--ink)",
                marginTop: "2px",
              }}
            >
              {archivedReadBookmarks.length}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              OFFLINE SNAPSHOTS
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--cyan)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {totalSnapshotsCount}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              READING TIME CONSUMED
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--yel)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {totalReadMinutes >= 60
                ? `${(totalReadMinutes / 60).toFixed(1)}h`
                : `${totalReadMinutes}m`}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              DRIFT & 404 RESCUED
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--pink)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {totalDriftProtected}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              TRASH RECOVERY
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--ink)",
                marginTop: "2px",
              }}
            >
              {trashBookmarks.length}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Vault Sub-Tabs & Filtering Strip ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Sub-Filters Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            { id: "all", label: "ALL ARCHIVE", count: archivedReadBookmarks.length || bookmarks.length },
            { id: "snapshots", label: "SNAPSHOTS", count: snapshotBookmarks.length },
            { id: "drift", label: "DRIFT & 404", count: driftBookmarks.length },
            { id: "discharged", label: "TIL DISCHARGED", count: dischargedBookmarks.length },
            { id: "trash", label: "TRASH / DELETED", count: trashBookmarks.length },
          ].map((tab) => {
            const isActive = subFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubFilter(tab.id as ArchiveSubFilter)}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "6px 12px",
                  border: "2px solid var(--ink)",
                  background: isActive ? "var(--yel)" : "var(--paper)",
                  color: isActive ? "#000" : "var(--ink)",
                  boxShadow: isActive ? "2px 2px 0 var(--ink)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.1s ease",
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: "9px",
                    background: isActive ? "var(--ink)" : "rgba(0,0,0,0.08)",
                    color: isActive ? "#fff" : "var(--ink)",
                    padding: "1px 5px",
                    fontWeight: 800,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search within Archive */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            padding: "4px 10px",
            flex: "1 1 240px",
            maxWidth: "360px",
            boxShadow: "2px 2px 0 var(--ink)",
          }}
        >
          <Search size={14} color="var(--ink)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, notes & full snapshot text..."
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              width: "100%",
              color: "var(--ink)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--mono)",
                fontWeight: 800,
                fontSize: "11px",
                color: "var(--ink)",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── Tags & Kind Pills ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 800,
            opacity: 0.6,
            color: "var(--ink)",
            marginRight: "4px",
          }}
        >
          KINDS:
        </span>
        {(Object.keys(TYPES) as KindType[]).map((k) => {
          const isSel = selectedKind === k;
          return (
            <button
              key={k}
              onClick={() => setSelectedKind(isSel ? null : k)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 8px",
                border: "1.5px solid var(--ink)",
                background: isSel ? "var(--ink)" : "var(--paper)",
                color: isSel ? "#fff" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          );
        })}

        {availableTags.length > 0 && (
          <>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                opacity: 0.6,
                color: "var(--ink)",
                marginLeft: "12px",
                marginRight: "4px",
              }}
            >
              TAGS:
            </span>
            {availableTags.slice(0, 8).map(([t, count]) => {
              const isSel = selectedTag === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTag(isSel ? null : t)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    border: "1.5px solid var(--ink)",
                    background: isSel ? "var(--cyan)" : "var(--paper)",
                    color: "#000",
                    cursor: "pointer",
                  }}
                >
                  #{t} ({count})
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* ─── Main Vault Grid & Reader Layout ───────────────────────────────── */}
      <div className={`archive-vault${activeReaderBookmark ? " has-reader" : ""}`}>
        {/* Bookmarks List */}
        <div className="archive-vault-list">
          {filteredItems.length === 0 ? (
            <div
              style={{
                background: "var(--paper)",
                border: "var(--bd)",
                boxShadow: "var(--sh-sm)",
                padding: "50px 20px",
                textAlign: "center",
                gridColumn: "1 / -1",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "16px",
                  color: "var(--ink)",
                }}
              >
                NO ITEMS IN THIS ARCHIVE FILTER
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  color: "var(--ink)",
                  opacity: 0.7,
                  marginTop: "6px",
                }}
              >
                Try selecting a different filter above or clearing your search term.
              </div>
            </div>
          ) : (
            filteredItems.map((bm) => {
              const isReaderActive = activeReaderBookmark?.id === bm.id;
              const hasSnapshot = Boolean(bm.archivedText);
              const is404 = bm.driftStatus === "404_preserved";
              const isChanged = bm.driftStatus === "changed";

              return (
                <div
                  key={bm.id}
                  style={{
                    background: "var(--paper)",
                    border: isReaderActive ? "3px solid var(--yel)" : "var(--bd)",
                    boxShadow: isReaderActive ? "4px 4px 0 var(--ink)" : "var(--sh-sm)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transition: "transform 0.1s ease",
                  }}
                >
                  {/* Top Cover / Header Banner */}
                  <div
                    style={{
                      height: "100px",
                      position: "relative",
                      overflow: "hidden",
                      borderBottom: "1.5px solid var(--ink)",
                    }}
                  >
                    <CoverCanvas
                      kind={bm.ty}
                      coverData={bm.coverData}
                      image={bm.coverImage}
                      ogImageKey={bm.ogImageKey}
                      ogLqip={bm.ogLqip}
                      coverSource={bm.coverSource}
                      ogStatus={bm.ogStatus}
                      height={100}
                    />

                    {/* Kind Badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        fontWeight: 900,
                        background: "var(--paper)",
                        color: "var(--ink)",
                        border: "1px solid var(--ink)",
                        padding: "1px 6px",
                        zIndex: 2,
                      }}
                    >
                      {bm.ty}
                    </span>

                    {/* Status badges */}
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        display: "flex",
                        gap: "4px",
                        zIndex: 2,
                      }}
                    >
                      {hasSnapshot && (
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "9px",
                            fontWeight: 800,
                            background: "var(--cyan)",
                            color: "#000",
                            border: "1px solid var(--ink)",
                            padding: "1px 5px",
                          }}
                        >
                          OFFLINE SNAPSHOT
                        </span>
                      )}
                      {is404 && (
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "9px",
                            fontWeight: 800,
                            background: "var(--pink)",
                            color: "#fff",
                            border: "1px solid var(--ink)",
                            padding: "1px 5px",
                          }}
                        >
                          404 RESCUED
                        </span>
                      )}
                      {bm.isDeleted && (
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "9px",
                            fontWeight: 800,
                            background: "#FF4444",
                            color: "#fff",
                            border: "1px solid var(--ink)",
                            padding: "1px 5px",
                          }}
                        >
                          TRASH
                        </span>
                      )}
                    </div>

                    {/* Archived Seal Stamp */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "6px",
                        right: "8px",
                        fontFamily: "var(--mono)",
                        fontSize: "9px",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        color: "var(--ink)",
                        opacity: 0.45,
                        transform: "rotate(-4deg)",
                        border: "1.5px solid var(--ink)",
                        padding: "1px 5px",
                        pointerEvents: "none",
                        zIndex: 2,
                      }}
                    >
                      [ARCHIVED]
                    </div>
                  </div>

                  {/* Body Info */}
                  <div
                    style={{
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "var(--ink)",
                        lineHeight: "1.3",
                        cursor: "pointer",
                      }}
                      onClick={() => setActiveReaderBookmark(bm)}
                    >
                      {bm.t}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        color: "var(--ink)",
                        opacity: 0.7,
                      }}
                    >
                      <span>{bm.src}</span>
                      <span>•</span>
                      <span>#{bm.tag}</span>
                      {bm.mins > 0 && (
                        <>
                          <span>•</span>
                          <span>{bm.mins}m</span>
                        </>
                      )}
                    </div>

                    {bm.note && (
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          background: "rgba(0,0,0,0.03)",
                          borderLeft: "2px solid var(--ink)",
                          padding: "4px 8px",
                          color: "var(--ink)",
                          marginTop: "2px",
                        }}
                      >
                        {bm.note}
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(0,0,0,0.02)",
                      borderTop: "1px solid rgba(0,0,0,0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "6px" }}>
                      {hasSnapshot ? (
                        <button
                          onClick={() => setActiveReaderBookmark(bm)}
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: isReaderActive ? "var(--yel)" : "var(--paper)",
                            color: "#000",
                            border: "1.5px solid var(--ink)",
                            padding: "3px 7px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <BookOpen size={11} /> READ SNAPSHOT
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpen(bm.id)}
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: "var(--paper)",
                            color: "var(--ink)",
                            border: "1.5px solid var(--ink)",
                            padding: "3px 7px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <ExternalLink size={11} /> OPEN LIVE
                        </button>
                      )}

                      {onDischarge && (
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onDischarge(bm, rect);
                          }}
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: "var(--lime)",
                            color: "#000",
                            border: "1.5px solid var(--ink)",
                            padding: "3px 7px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                          title="Discharge insight into TIL"
                        >
                          <Zap size={11} /> TO TIL
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      {bm.isDeleted ? (
                        <>
                          <button
                            onClick={() => onRestore(bm.id)}
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "10px",
                              fontWeight: 900,
                              background: "var(--lime)",
                              color: "#000",
                              border: "1.5px solid var(--ink)",
                              padding: "3px 7px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <RotateCcw size={11} /> RESTORE
                          </button>
                          <button
                            onClick={() => onPurge(bm.id)}
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "10px",
                              fontWeight: 900,
                              background: "#FF4444",
                              color: "#fff",
                              border: "1.5px solid var(--ink)",
                              padding: "3px 7px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Permanently erase from database"
                          >
                            <Trash2 size={11} /> PURGE
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onToggleRead(bm.id)}
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "10px",
                              fontWeight: 800,
                              background: "var(--paper)",
                              color: "var(--ink)",
                              border: "1.5px solid var(--ink)",
                              padding: "3px 7px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Move back to active Queue"
                          >
                            <RotateCcw size={11} /> UNREAD
                          </button>
                          <button
                            onClick={() => handleCopyMarkdown(bm)}
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "10px",
                              fontWeight: 800,
                              background: copiedId === bm.id ? "var(--lime)" : "var(--paper)",
                              color: "var(--ink)",
                              border: "1.5px solid var(--ink)",
                              padding: "3px 7px",
                              cursor: "pointer",
                            }}
                            title="Copy Markdown"
                          >
                            {copiedId === bm.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Integrated Interactive Reader Drawer ────────────────────────── */}
        {activeReaderBookmark && (
          <div
            className="archive-reader"
            style={{
              background: "var(--paper)",
              border: "var(--bd)",
              boxShadow: "var(--sh)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1.5px solid var(--ink)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    fontWeight: 900,
                    background: "var(--yel)",
                    color: "#000",
                    border: "1px solid var(--ink)",
                    padding: "2px 6px",
                  }}
                >
                  OFFLINE READER MODE
                </span>
                <h2
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "var(--ink)",
                    marginTop: "8px",
                    lineHeight: "1.3",
                  }}
                >
                  {activeReaderBookmark.t}
                </h2>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    color: "var(--ink)",
                    opacity: 0.7,
                    marginTop: "4px",
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span>Source: {activeReaderBookmark.src}</span>
                  <span>•</span>
                  <span>Tag: #{activeReaderBookmark.tag}</span>
                  {activeReaderBookmark.lastFetchedAt && (
                    <>
                      <span>•</span>
                      <span>
                        Snapshot: {new Date(activeReaderBookmark.lastFetchedAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveReaderBookmark(null)}
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "14px",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "2px solid var(--ink)",
                  cursor: "pointer",
                  padding: "2px 8px",
                  boxShadow: "2px 2px 0 var(--ink)",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick action strip in Reader */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <a
                href={activeReaderBookmark.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "1.5px solid var(--ink)",
                  padding: "4px 8px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "1.5px 1.5px 0 var(--ink)",
                }}
              >
                <ExternalLink size={11} /> OPEN ORIGINAL URL
              </a>

              {activeReaderBookmark.driftStatus && onOpenDiff && (
                <button
                  onClick={() => onOpenDiff(activeReaderBookmark)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    background: "var(--cyan)",
                    color: "#000",
                    border: "1.5px solid var(--ink)",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "1.5px 1.5px 0 var(--ink)",
                  }}
                >
                  <ShieldCheck size={11} /> VIEW DRIFT DIFF
                </button>
              )}

              <button
                onClick={() => handleCopyMarkdown(activeReaderBookmark)}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  background: copiedId === activeReaderBookmark.id ? "var(--lime)" : "var(--paper)",
                  color: "var(--ink)",
                  border: "1.5px solid var(--ink)",
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "1.5px 1.5px 0 var(--ink)",
                }}
              >
                {copiedId === activeReaderBookmark.id ? <Check size={11} /> : <Copy size={11} />}
                {copiedId === activeReaderBookmark.id ? "COPIED" : "COPY MARKDOWN"}
              </button>
            </div>

            {/* Reader Content Body */}
            <div
              style={{
                fontFamily: "var(--grot)",
                fontSize: "14px",
                lineHeight: "1.65",
                color: "var(--ink)",
                background: "rgba(0,0,0,0.02)",
                padding: "16px",
                border: "1px solid rgba(0,0,0,0.1)",
                whiteSpace: "pre-wrap",
                maxHeight: "500px",
                overflowY: "auto",
              }}
            >
              {activeReaderBookmark.archivedText ? (
                activeReaderBookmark.archivedText
              ) : (
                <div style={{ fontStyle: "italic", opacity: 0.6 }}>
                  No full-text offline snapshot cached for this bookmark yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
