"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ScrapRow, ScrapKind, scrapKindValues } from "@/db/schema";
import { ScratchCard } from "./ScratchCard";
import { ScratchMarkdown } from "./ScratchMarkdown";
import { ScratchNoteModal } from "./ScratchNoteModal";
import { isScrapPinned } from "@/lib/scratch/filters";
import { playSound } from "@/lib/sound";

interface ScratchPinnedViewProps {
  scraps: ScrapRow[];
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onPromoteTodo: (id: string) => Promise<void> | void;
  onWeld: (id: string) => void;
  onBury: (id: string) => Promise<void> | void;
  onTogglePin: (id: string) => Promise<void> | void;
}

type SortOption = "pinned_newest" | "pinned_oldest" | "words_desc" | "date_desc" | "kind";
type PinLayout = "grid" | "docket";

export const ScratchPinnedView: React.FC<ScratchPinnedViewProps> = ({
  scraps,
  onUpdateNotes,
  onPromoteTil,
  onPromoteTodo,
  onWeld,
  onBury,
  onTogglePin,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<ScrapKind | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("pinned_newest");
  const [layout, setLayout] = useState<PinLayout>("grid");
  const [selectedScrapId, setSelectedScrapId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [modalScrap, setModalScrap] = useState<ScrapRow | null>(null);

  // Filter only pinned scraps
  const pinnedScraps = useMemo(() => {
    return scraps.filter(isScrapPinned);
  }, [scraps]);

  // Compute metrics
  const stats = useMemo(() => {
    let totalWords = 0;
    let diagramsCount = 0;
    let taskCount = 0;

    for (const s of pinnedScraps) {
      if (s.notes) {
        totalWords += s.notes.trim().split(/\s+/).filter(Boolean).length;
        if (s.notes.includes(":::ink") || s.notes.includes(":::diagram") || s.notes.includes(":::infographic") || s.notes.includes("<svg")) {
          diagramsCount++;
        }
        const taskMatches = s.notes.match(/- \[[ xX]\]/g);
        if (taskMatches) taskCount += taskMatches.length;
      }
      if (s.kind === "INK") diagramsCount++;
    }

    return {
      total: pinnedScraps.length,
      totalWords,
      diagramsCount,
      taskCount,
    };
  }, [pinnedScraps]);

  // Filtered & Sorted pinned scraps
  const displayScraps = useMemo(() => {
    let filtered = pinnedScraps;

    if (selectedKind !== "ALL") {
      filtered = filtered.filter((s) => s.kind === selectedKind);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.content.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "pinned_newest") {
        const timeA = a.entities?.pinnedAt ? new Date(a.entities.pinnedAt).getTime() : 0;
        const timeB = b.entities?.pinnedAt ? new Date(b.entities.pinnedAt).getTime() : 0;
        return timeB - timeA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "pinned_oldest") {
        const timeA = a.entities?.pinnedAt ? new Date(a.entities.pinnedAt).getTime() : 0;
        const timeB = b.entities?.pinnedAt ? new Date(b.entities.pinnedAt).getTime() : 0;
        return timeA - timeB || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "words_desc") {
        const wA = (a.notes || "").trim().split(/\s+/).filter(Boolean).length;
        const wB = (b.notes || "").trim().split(/\s+/).filter(Boolean).length;
        return wB - wA;
      }
      if (sortBy === "date_desc") {
        return b.loggedFor.localeCompare(a.loggedFor);
      }
      if (sortBy === "kind") {
        return a.kind.localeCompare(b.kind);
      }
      return 0;
    });
  }, [pinnedScraps, selectedKind, searchQuery, sortBy]);

  // Selected scrap for docket view
  const activeScrap = useMemo(() => {
    if (!selectedScrapId && displayScraps.length > 0) {
      return displayScraps[0];
    }
    return displayScraps.find((s) => s.id === selectedScrapId) || displayScraps[0] || null;
  }, [selectedScrapId, displayScraps]);

  // Copy all pinned notes as one combined markdown doc
  const handleCopyAllPinned = useCallback(async () => {
    if (pinnedScraps.length === 0) return;
    playSound.copy();

    const sections = pinnedScraps.map((s, idx) => {
      const title = s.content.length > 80 ? s.content.slice(0, 77) + "..." : s.content;
      const date = s.occurredOn || s.loggedFor;
      const words = (s.notes || "").trim().split(/\s+/).filter(Boolean).length;
      return `## ${idx + 1}. [${s.kind}] ${title}\n*Logged: ${date} · ${words} words*\n\n${s.content}\n\n${
        s.notes ? `### Notes\n${s.notes}` : "*No additional notes.*"
      }\n`;
    });

    const fullDoc = `# 📌 HOARD Pinboard Synthesis Export\n*Exported ${new Date().toLocaleString()} · ${
      pinnedScraps.length
    } Pinned Notes*\n\n---\n\n${sections.join("\n---\n\n")}`;

    try {
      await navigator.clipboard.writeText(fullDoc);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // ignore
    }
  }, [pinnedScraps]);

  // Handle quick pin sample scrap when board is empty
  const handlePinFirstAvailable = useCallback(() => {
    const unpinnedWithNotes = scraps.find((s) => !isScrapPinned(s) && s.notes && s.notes.trim().length > 0);
    const candidate = unpinnedWithNotes || scraps.find((s) => !isScrapPinned(s));
    if (candidate) {
      playSound.pin(true);
      void onTogglePin(candidate.id);
    }
  }, [scraps, onTogglePin]);

  return (
    <div className="scratch-pinned-root">
      {/* ── STAGE BANNER ── */}
      <div className="pinboard-banner">
        <div className="pinboard-banner__content">
          <div className="pinboard-badge">
            <span className="pinboard-badge__icon">📎</span>
            <span>PINBOARD VAULT</span>
          </div>
          <h2>THE PINBOARD</h2>
          <p>
            HIGH-LEVERAGE NOTES, AI SYNTHESES, DIAGRAMS &amp; FRAGMENTS PINNED AT THE FOREFRONT.
            KEPT SAFE FROM SHELF GRAVITY &amp; COMPOST DECAY.
          </p>
        </div>

        {/* HUD STATS */}
        <div className="pinboard-hud">
          <div className="pinboard-hud__card">
            <span className="hud-val">{stats.total}</span>
            <span className="hud-lbl">PINNED ITEMS</span>
          </div>
          <div className="pinboard-hud__card">
            <span className="hud-val">{stats.totalWords.toLocaleString()}</span>
            <span className="hud-lbl">NOTE WORDS</span>
          </div>
          <div className="pinboard-hud__card">
            <span className="hud-val">{stats.diagramsCount}</span>
            <span className="hud-lbl">DIAGRAMS &amp; INK</span>
          </div>
          <div className="pinboard-hud__card">
            <span className="hud-val">{stats.taskCount}</span>
            <span className="hud-lbl">ACTION TASKS</span>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR & CONTROLS ── */}
      <div className="pinboard-toolbar">
        <div className="pinboard-toolbar__search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pinned items by title, notes, #tags..."
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="pinboard-toolbar__controls">
          {/* SORT SELECTOR */}
          <div className="sort-group">
            <span className="ctrl-label">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                playSound.click();
                setSortBy(e.target.value as SortOption);
              }}
            >
              <option value="pinned_newest">📎 NEWEST PINNED</option>
              <option value="pinned_oldest">📎 OLDEST PINNED</option>
              <option value="words_desc">📝 MOST WORDS</option>
              <option value="date_desc">⏰ OCCURRED DATE</option>
              <option value="kind">🎨 BY KIND</option>
            </select>
          </div>

          {/* LAYOUT SELECTOR */}
          <div className="layout-toggle">
            <button
              type="button"
              className={layout === "grid" ? "active" : ""}
              onClick={() => {
                playSound.click();
                setLayout("grid");
              }}
              title="Pinboard Corkboard Grid"
            >
              ⊞ GRID
            </button>
            <button
              type="button"
              className={layout === "docket" ? "active" : ""}
              onClick={() => {
                playSound.click();
                setLayout("docket");
              }}
              title="Side-by-side Deep Docket Studio"
            >
              ◫ DOCKET
            </button>
          </div>

          {/* COPY ALL AS MD */}
          {pinnedScraps.length > 0 && (
            <button
              type="button"
              className="copy-all-btn"
              onClick={() => void handleCopyAllPinned()}
              title="Export and copy all pinned notes as structured Markdown"
            >
              {copiedAll ? "✓ ALL COPIED!" : "📋 EXPORT ALL MD"}
            </button>
          )}
        </div>
      </div>

      {/* ── KIND FILTER CHIPS ── */}
      <div className="pinboard-kind-chips">
        <button
          type="button"
          className={`kind-chip ${selectedKind === "ALL" ? "active" : ""}`}
          onClick={() => {
            playSound.click();
            setSelectedKind("ALL");
          }}
        >
          ALL ({pinnedScraps.length})
        </button>
        {scrapKindValues.map((k) => {
          const count = pinnedScraps.filter((s) => s.kind === k).length;
          if (count === 0 && selectedKind !== k) return null;
          return (
            <button
              key={k}
              type="button"
              className={`kind-chip ${selectedKind === k ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setSelectedKind(k);
              }}
            >
              {k} ({count})
            </button>
          );
        })}
      </div>

      {/* ── EMPTY STATE ── */}
      {displayScraps.length === 0 ? (
        <div className="pinboard-empty">
          <div className="pinboard-empty__tack">📌</div>
          <h3>NO PINNED SCRAPS</h3>
          <p>
            {pinnedScraps.length === 0
              ? "You haven't pinned any scraps yet. Click the paperclip 📎 icon on the top-left of any card in The Shelf to keep essential notes and diagrams pinned here."
              : "No pinned scraps match your search and filter criteria."}
          </p>
          {pinnedScraps.length === 0 && scraps.length > 0 && (
            <button
              type="button"
              className="pinboard-empty__action-btn"
              onClick={handlePinFirstAvailable}
            >
              📎 PIN A RECENT SCRAP TO TEST
            </button>
          )}
        </div>
      ) : layout === "grid" ? (
        /* ═══ GRID VIEW: PINBOARD CARDS MASONRY ═══ */
        <div className="pinboard-grid">
          {displayScraps.map((scrap) => (
            <div key={scrap.id} className="pinboard-item-wrap">
              <ScratchCard
                scrap={scrap}
                isOpenDefault={false}
                onUpdateNotes={onUpdateNotes}
                onPromoteTil={onPromoteTil}
                onPromoteTodo={onPromoteTodo}
                onWeld={onWeld}
                onBury={onBury}
                onTogglePin={onTogglePin}
              />
            </div>
          ))}
        </div>
      ) : (
        /* ═══ DOCKET VIEW: MASTER-DETAIL SPLIT STUDIO ═══ */
        <div className="pinboard-docket">
          {/* LEFT LIST */}
          <div className="pinboard-docket__sidebar">
            <div className="docket-sidebar-head">
              <span>PINNED LIST</span>
              <span>{displayScraps.length} ITEMS</span>
            </div>
            <div className="docket-sidebar-items">
              {displayScraps.map((scrap) => {
                const isSelected = activeScrap?.id === scrap.id;
                const wordCount = (scrap.notes || "").trim().split(/\s+/).filter(Boolean).length;
                return (
                  <div
                    key={scrap.id}
                    className={`docket-nav-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      playSound.click();
                      setSelectedScrapId(scrap.id);
                    }}
                  >
                    <div className="docket-nav-item__top">
                      <span className={`k ${scrap.color || "cyan"}`}>{scrap.kind}</span>
                      <span className="date">{scrap.occurredOn || scrap.loggedFor}</span>
                    </div>
                    <div className="docket-nav-item__title">
                      {scrap.content.slice(0, 75)}
                      {scrap.content.length > 75 ? "..." : ""}
                    </div>
                    <div className="docket-nav-item__foot">
                      <span>{wordCount > 0 ? `📝 ${wordCount}w` : "NO NOTES"}</span>
                      <button
                        type="button"
                        className="unpin-mini-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound.pin(false);
                          void onTogglePin(scrap.id);
                        }}
                        title="Unpin"
                      >
                        📎 UNPIN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT DETAILED CANVAS */}
          {activeScrap && (
            <div className="pinboard-docket__canvas">
              <div className="docket-canvas-head">
                <div className="docket-canvas-head__meta">
                  <span className={`k ${activeScrap.color || "cyan"}`}>{activeScrap.kind}</span>
                  <b>{activeScrap.content}</b>
                </div>
                <div className="docket-canvas-head__acts">
                  <button
                    type="button"
                    className="studio-btn"
                    onClick={() => {
                      playSound.click();
                      setModalScrap(activeScrap);
                    }}
                  >
                    📝 EXPAND IN STUDIO ⤢
                  </button>
                  <button
                    type="button"
                    className="unpin-btn is-pinned"
                    onClick={() => {
                      playSound.pin(false);
                      void onTogglePin(activeScrap.id);
                    }}
                  >
                    📎 UNPIN
                  </button>
                </div>
              </div>

              {/* DOCKET CARD PREVIEW */}
              <div className="docket-canvas-body">
                <ScratchCard
                  scrap={activeScrap}
                  isOpenDefault={true}
                  onUpdateNotes={onUpdateNotes}
                  onPromoteTil={onPromoteTil}
                  onPromoteTodo={onPromoteTodo}
                  onWeld={onWeld}
                  onBury={onBury}
                  onTogglePin={onTogglePin}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL IF OPENED FROM DOCKET ── */}
      {modalScrap && (
        <ScratchNoteModal
          isOpen={Boolean(modalScrap)}
          scrap={modalScrap}
          notes={modalScrap.notes || ""}
          isPinned={isScrapPinned(modalScrap)}
          onTogglePin={onTogglePin}
          onUpdateNotes={onUpdateNotes}
          onClose={() => setModalScrap(null)}
          onPromoteTil={onPromoteTil}
        />
      )}
    </div>
  );
};
