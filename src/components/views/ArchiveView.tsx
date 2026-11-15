"use client";

import React, { useState, useMemo } from "react";
import { Bookmark, Collection } from "@/types";
import {
  BookOpen,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  Download,
  Trash2,
  Copy,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CoverCanvas } from "@/components/covers/CoverCanvas";

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
  onRecordUse?: (id: number) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  bookmarks,
  onOpen,
  onToggleRead,
  onRestore,
  onPurge,
  onOpenDiff,
  onDischarge,
  onRecordUse,
}) => {
  const [subFilter, setSubFilter] = useState<ArchiveSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReaderBookmark, setActiveReaderBookmark] = useState<Bookmark | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [confirmPurgeId, setConfirmPurgeId] = useState<number | null>(null);

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
        (b) =>
          !b.isDeleted &&
          Boolean(
            b.note &&
              b.note.trim().length > 0 &&
              b.note !== "Saved via HOARD Extension"
          )
      ),
    [bookmarks]
  );

  const trashBookmarks = useMemo(
    () => bookmarks.filter((b) => b.isDeleted),
    [bookmarks]
  );

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
        return archivedReadBookmarks;
    }
  }, [
    subFilter,
    snapshotBookmarks,
    driftBookmarks,
    dischargedBookmarks,
    trashBookmarks,
    archivedReadBookmarks,
  ]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return baseList;
    return baseList.filter((b) => {
      const hay = `${b.t} ${b.src} ${b.tag} ${b.note || ""} ${b.archivedText || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [baseList, searchQuery]);

  const handleCopyMarkdown = (b: Bookmark) => {
    const content = `# ${b.t}\nSource: ${b.url}\nType: ${b.ty} | Tag: #${b.tag}\n\n${b.archivedText || b.note || "No cached text content."}`;
    navigator.clipboard.writeText(content);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const tabs: { id: ArchiveSubFilter; label: string; count: number }[] = [
    { id: "all", label: "ARCHIVED (READ)", count: archivedReadBookmarks.length },
    { id: "snapshots", label: "SNAPSHOTS", count: snapshotBookmarks.length },
    { id: "drift", label: "DRIFT & 404", count: driftBookmarks.length },
    { id: "discharged", label: "ANNOTATED", count: dischargedBookmarks.length },
    { id: "trash", label: "TRASH", count: trashBookmarks.length },
  ];

  return (
    <div className="vault-workbench">
      {/* ─── Streamlined Vault Toolbar ──────────────────────────────────────── */}
      <div className="vault-toolbar">
        <div className="vault-tabs" role="tablist" aria-label="Archive Vault sections">
          {tabs.map((tab) => {
            const isActive = subFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`vault-tab ${isActive ? "on" : ""}`}
                onClick={() => setSubFilter(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="vault-tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="vault-toolbar-right">
          <div className="lib-omnibox" style={{ minWidth: "220px", minHeight: "32px" }}>
            <span className="lib-omnibox-icon">
              <Search size={13} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter vault items or snapshots..."
              aria-label="Filter vault items"
            />
            {searchQuery && (
              <button
                type="button"
                className="vault-btn"
                style={{ border: 0, padding: "2px 4px" }}
                onClick={() => setSearchQuery("")}
                aria-label="Clear vault search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="vault-btn primary"
            onClick={handleExportCompendium}
          >
            {copiedAll ? <Check size={13} /> : <Download size={13} />}
            {copiedAll ? "EXPORTED" : "EXPORT JSON"}
          </button>
        </div>
      </div>

      {/* ─── Main Vault Grid & Reader Layout ───────────────────────────────── */}
      <div className={`archive-vault${activeReaderBookmark ? " has-reader" : ""}`}>
        <div className="archive-vault-list">
          {filteredItems.length === 0 ? (
            <div className="empty" style={{ gridColumn: "1 / -1" }}>
              <b>NO ITEMS IN THIS VAULT VIEW</b>
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.72 }}>
                Mark bookmarks as read (`VAULT`) or switch sub-tabs above to view preserved snapshots.
              </div>
            </div>
          ) : (
            filteredItems.map((bm) => {
              const isReaderActive = activeReaderBookmark?.id === bm.id;
              const hasSnapshot = Boolean(bm.archivedText);
              const is404 = bm.driftStatus === "404_preserved";
              const isConfirmingPurge = confirmPurgeId === bm.id;

              return (
                <article
                  key={bm.id}
                  className={`vault-card ${isReaderActive ? "active" : ""}`}
                >
                  <div className="vault-card-cover">
                    <CoverCanvas
                      kind={bm.ty}
                      coverData={bm.coverData}
                      image={bm.coverImage}
                      ogImageKey={bm.ogImageKey}
                      ogLqip={bm.ogLqip}
                      coverSource={bm.coverSource}
                      ogStatus={bm.ogStatus}
                      height={88}
                    />
                    <span
                      className="tybadge"
                      style={{ position: "absolute", left: "8px", bottom: "8px" }}
                    >
                      {bm.ty}
                    </span>

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
                          className="card-status-badge"
                          style={{ background: "var(--cyan)", color: "#000" }}
                        >
                          SNAPSHOT
                        </span>
                      )}
                      {is404 && (
                        <span
                          className="card-status-badge"
                          style={{ background: "var(--pink)", color: "#fff" }}
                        >
                          404 RESCUED
                        </span>
                      )}
                      {bm.isDeleted && (
                        <span
                          className="card-status-badge"
                          style={{ background: "var(--pink)", color: "#fff" }}
                        >
                          TRASH
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="vault-card-body">
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vault-card-title"
                      onClick={() => onRecordUse?.(bm.id)}
                    >
                      {bm.t}
                    </a>

                    <div className="vault-card-meta">
                      <span>{bm.src}</span>
                      {bm.tag && (
                        <>
                          <span>·</span>
                          <span>#{bm.tag}</span>
                        </>
                      )}
                      {bm.ty === "ART" && bm.mins > 0 && (
                        <>
                          <span>·</span>
                          <span>{bm.mins}m</span>
                        </>
                      )}
                    </div>

                    {bm.note && bm.note !== "Saved via HOARD Extension" && (
                      <div className="vault-card-note">{bm.note}</div>
                    )}
                  </div>

                  <div className="vault-card-foot">
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {hasSnapshot && (
                        <button
                          type="button"
                          className={`vault-btn ${isReaderActive ? "primary" : ""}`}
                          onClick={() =>
                            setActiveReaderBookmark(isReaderActive ? null : bm)
                          }
                        >
                          <BookOpen size={11} /> SNAPSHOT
                        </button>
                      )}

                      <button
                        type="button"
                        className="vault-btn"
                        onClick={() => {
                          window.open(bm.url, "_blank", "noopener,noreferrer");
                          onRecordUse?.(bm.id);
                        }}
                        title="Open live URL in a new tab"
                      >
                        <ExternalLink size={11} /> OPEN LIVE
                      </button>

                      <button
                        type="button"
                        className="vault-btn"
                        onClick={() => onOpen(bm.id)}
                        title="Open in Inspector Drawer"
                      >
                        <SlidersHorizontal size={11} /> INSPECT
                      </button>

                      {onDischarge && !bm.isDeleted && (
                        <button
                          type="button"
                          className="vault-btn"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onDischarge(bm, rect);
                          }}
                          title="Log TIL note from this bookmark"
                        >
                          <Zap size={11} /> TIL
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                      {bm.isDeleted ? (
                        <>
                          <button
                            type="button"
                            className="vault-btn primary"
                            onClick={() => onRestore(bm.id)}
                          >
                            <RotateCcw size={11} /> RESTORE
                          </button>

                          {isConfirmingPurge ? (
                            <>
                              <button
                                type="button"
                                className="vault-btn danger"
                                onClick={() => {
                                  setConfirmPurgeId(null);
                                  onPurge(bm.id);
                                }}
                              >
                                <Trash2 size={11} /> CONFIRM PURGE
                              </button>
                              <button
                                type="button"
                                className="vault-btn"
                                onClick={() => setConfirmPurgeId(null)}
                              >
                                CANCEL
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="vault-btn danger"
                              onClick={() => setConfirmPurgeId(bm.id)}
                              title="Permanently erase from database"
                            >
                              <Trash2 size={11} /> PURGE
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="vault-btn"
                            onClick={() => onToggleRead(bm.id)}
                            title="Move back to active shelf"
                          >
                            <RotateCcw size={11} /> RESTORE TO SHELF
                          </button>
                          <button
                            type="button"
                            className="vault-btn"
                            onClick={() => handleCopyMarkdown(bm)}
                            title="Copy Markdown"
                            aria-label="Copy Markdown"
                          >
                            {copiedId === bm.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ─── Integrated Interactive Reader Drawer ────────────────────────── */}
        {activeReaderBookmark && (
          <aside className="archive-reader vault-reader-pane">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                borderBottom: "1.5px solid var(--ink)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "var(--ink)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {activeReaderBookmark.t}
                </h2>
                <div className="vault-card-meta" style={{ marginTop: "6px" }}>
                  <span>{activeReaderBookmark.src}</span>
                  <span>·</span>
                  <span>#{activeReaderBookmark.tag}</span>
                  {activeReaderBookmark.lastFetchedAt && (
                    <>
                      <span>·</span>
                      <span>
                        Snapshot: {new Date(activeReaderBookmark.lastFetchedAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="vault-btn"
                onClick={() => setActiveReaderBookmark(null)}
                aria-label="Close snapshot reader"
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <a
                href={activeReaderBookmark.url}
                target="_blank"
                rel="noreferrer"
                className="vault-btn"
                onClick={() => onRecordUse?.(activeReaderBookmark.id)}
              >
                <ExternalLink size={11} /> OPEN ORIGINAL URL
              </a>

              {activeReaderBookmark.driftStatus && onOpenDiff && (
                <button
                  type="button"
                  className="vault-btn primary"
                  onClick={() => onOpenDiff(activeReaderBookmark)}
                >
                  <ShieldCheck size={11} /> VIEW DRIFT DIFF
                </button>
              )}

              <button
                type="button"
                className="vault-btn"
                onClick={() => handleCopyMarkdown(activeReaderBookmark)}
              >
                {copiedId === activeReaderBookmark.id ? <Check size={11} /> : <Copy size={11} />}
                {copiedId === activeReaderBookmark.id ? "COPIED" : "COPY MARKDOWN"}
              </button>
            </div>

            <div className="vault-reader-text">
              {activeReaderBookmark.archivedText ? (
                activeReaderBookmark.archivedText
              ) : (
                <div style={{ fontStyle: "italic", opacity: 0.68 }}>
                  No full-text offline snapshot cached for this bookmark yet.
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
