"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { ScratchSlab } from "@/components/scratch/ScratchSlab";
import { ScratchFilterBar } from "@/components/scratch/ScratchFilterBar";
import { ScratchFeed } from "@/components/scratch/ScratchFeed";
import { ScratchSheet } from "@/components/scratch/ScratchSheet";
import { ScratchYearWall } from "@/components/scratch/ScratchYearWall";
import { ScratchSidePanels } from "@/components/scratch/ScratchSidePanels";
import { ScratchWeldModal } from "@/components/scratch/ScratchWeldModal";
import { ScratchPinnedView } from "@/components/scratch/ScratchPinnedView";
import { ScratchSeance } from "@/components/scratch/ScratchSeance";
import { ScratchCorkboard } from "@/components/scratch/ScratchCorkboard";
import { ScrapRow, ScrapKind } from "@/db/schema";
import { ScratchStats } from "@/lib/dal/scratch";
import { CollisionCandidate, CollisionHit } from "@/lib/scratch/collision";
import { ScratchFilters, filterScraps, isScrapPinned } from "@/lib/scratch/filters";
import { getLocalTodayIso } from "@/lib/scratch/parse";
import { playSound } from "@/lib/sound";

function ScratchPageContent() {
  const [scraps, setScraps] = useState<ScrapRow[]>([]);
  const [stats, setStats] = useState<ScratchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"stream" | "pinned" | "logbook" | "corkboard">("stream");

  // Filters state
  const [filters, setFilters] = useState<ScratchFilters>({
    query: "",
    kind: "ALL",
    tag: null,
    date: null,
    status: "all",
  });

  // Weld Modal state
  const [weldTargetScrap, setWeldTargetScrap] = useState<ScrapRow | null>(null);
  const [isWeldModalOpen, setIsWeldModalOpen] = useState(false);

  // Séance (dig-up) banner state
  const [seanceScrap, setSeanceScrap] = useState<ScrapRow | null>(null);

  const fetchScraps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/scratch", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setScraps(data.items || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load scratch data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Quietly refresh stats in the background without flashing the UI
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/scratch", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
      }
    } catch (_) {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchScraps();
  }, [fetchScraps]);

  // Séance: surface one buried scrap at most once per day
  useEffect(() => {
    const today = getLocalTodayIso();
    const lastShown = localStorage.getItem("hoard_seance_last_shown");
    if (lastShown === today) return;

    (async () => {
      try {
        const res = await fetch("/api/scratch/seance", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.scrap) {
            setSeanceScrap(data.scrap);
            localStorage.setItem("hoard_seance_last_shown", today);
          }
        }
      } catch (err) {
        console.error("Failed to fetch séance scrap", err);
      }
    })();
  }, []);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleFilterChange = (patch: Partial<ScratchFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleResetFilters = () => {
    setFilters({
      query: "",
      kind: "ALL",
      tag: null,
      date: null,
      status: "all",
    });
  };

  // 1. File new scrap from Slab
  const handleFileScrap = async (
    text: string,
    options?: {
      kind?: ScrapKind;
      inkSvg?: string;
      inkStrokes?: any[];
      transcription?: string;
    }
  ) => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const clientDate = getLocalTodayIso();
      const res = await fetch("/api/scratch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          clientDate,
          kind: options?.kind,
          inkSvg: options?.inkSvg,
          inkStrokes: options?.inkStrokes,
          transcription: options?.transcription,
        }),
      });

      if (res.ok) {
        const created: ScrapRow = await res.json();
        setScraps((prev) => [created, ...prev]);
        showToast(
          created.kind === "LOG"
            ? "✓ Log filed to The Sheet"
            : created.kind === "INK"
            ? "✓ Ink scrap filed to The Shelf"
            : "✓ Scrap filed to The Shelf"
        );
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to file scrap", err);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Update notes on a scrap
  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/scratch/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        const updated: ScrapRow = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      }
    } catch (err) {
      console.error("Failed to update notes", err);
    }
  };

  // 3. Promote to TIL
  const handlePromoteTil = async (id: string) => {
    try {
      const res = await fetch(`/api/scratch/${id}/promote-til`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const { scrap, shortHash } = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === id ? { ...s, ...scrap } : s)));
        showToast(`✓ Minted as TIL #${shortHash}`);
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to promote to TIL", err);
    }
  };

  // 4. Promote to Todo
  const handlePromoteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/scratch/${id}/promote-todo`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const { scrap } = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === id ? { ...s, ...scrap } : s)));
        showToast("✓ Promoted to Todo item");
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to promote to Todo", err);
    }
  };

  // 5. Open Weld Modal
  const handleOpenWeldModal = (id: string) => {
    const target = scraps.find((s) => s.id === id);
    if (target) {
      setWeldTargetScrap(target);
      setIsWeldModalOpen(true);
    }
  };

  // 6. Direct weld from collision banner in Slab
  const handleWeldFromSlab = (candidate: CollisionHit, currentSlabText: string) => {
    const target = scraps.find((s) => s.id === candidate.id);
    if (target) {
      const mergedNotes = target.notes
        ? `${target.notes}\n\n---\n\n${currentSlabText}`
        : currentSlabText;
      void handleUpdateNotes(target.id, mergedNotes);
      showToast("✓ Welded into existing scrap notes");
    }
  };

  // 7. Confirm weld from modal
  const handleConfirmWeld = async (sourceId: string, targetId: string) => {
    try {
      const res = await fetch(`/api/scratch/${targetId}/weld`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });

      if (res.ok) {
        const updatedTarget: ScrapRow = await res.json();
        setScraps((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, ...updatedTarget } : s))
        );
        setIsWeldModalOpen(false);
        setWeldTargetScrap(null);
        showToast("✓ Welded scraps together");
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to weld scraps", err);
    }
  };

  // 8. Bury / Soft Delete
  const handleBury = async (id: string) => {
    try {
      const res = await fetch(`/api/scratch/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setScraps((prev) => prev.filter((s) => s.id !== id));
        showToast("✓ Buried scrap");
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to bury scrap", err);
    }
  };

  // 9. Bulk bury compost items
  const handleBuryCompost = async (ids: string[]) => {
    try {
      const res = await fetch("/api/scratch/compost", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bury", ids }),
      });

      if (res.ok) {
        setScraps((prev) => prev.filter((s) => !ids.includes(s.id)));
        showToast(`✓ Buried ${ids.length} items`);
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to bury compost", err);
    }
  };

  // 10. Bulk keep compost items
  const handleKeepCompost = async (ids: string[]) => {
    try {
      const res = await fetch("/api/scratch/compost", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "keep", ids }),
      });

      if (res.ok) {
        showToast("✓ Marked items kept");
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to keep compost", err);
    }
  };

  // 10b. Restore a dug-up (séance) scrap back to the Shelf
  const handleRestoreSeance = async (id: string) => {
    try {
      const res = await fetch("/api/scratch/compost", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "keep", ids: [id] }),
      });

      if (res.ok) {
        setSeanceScrap(null);
        showToast("✓ Restored to the Shelf");
        void fetchScraps();
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to restore séance scrap", err);
    }
  };

  // 11. Scroll to question scrap
  const handleSelectQuestion = (scrapId: string) => {
    const el = document.getElementById(`scrap-${scrapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("open");
    }
  };

  // 12. Toggle Pin status
  const handleTogglePin = async (id: string) => {
    try {
      const target = scraps.find((s) => s.id === id);
      const isCurrentlyPinned = Boolean(target?.entities?.isPinned);

      // Optimistic update
      setScraps((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                entities: {
                  ...(s.entities || {}),
                  isPinned: !isCurrentlyPinned,
                  pinnedAt: !isCurrentlyPinned ? new Date().toISOString() : undefined,
                },
              }
            : s
        )
      );
      showToast(!isCurrentlyPinned ? "📌 Pinned note to Pinboard" : "✓ Unpinned note");

      const res = await fetch(`/api/scratch/${id}/pin`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const updated: ScrapRow = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  // 13. Persist a scrap's dragged corkboard position
  const handleUpdatePosition = async (id: string, x: number, y: number) => {
    // Optimistic — the corkboard component already updates its own local
    // position state on drag, so this just needs to persist silently.
    try {
      const res = await fetch(`/api/scratch/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities: { boardX: x, boardY: y } }),
      });

      if (res.ok) {
        const updated: ScrapRow = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      }
    } catch (err) {
      console.error("Failed to save corkboard position", err);
    }
  };

  const pinnedCount = useMemo(() => scraps.filter(isScrapPinned).length, [scraps]);

  const collisionCandidates: CollisionCandidate[] = useMemo(() => {
    return scraps.map((s) => ({
      id: s.id,
      content: s.content,
      createdAt: s.createdAt,
    }));
  }, [scraps]);

  // Split into Shelf (non-LOG) and Sheet (LOG) scraps
  const shelfScraps = useMemo(() => scraps.filter((s) => s.kind !== "LOG"), [scraps]);
  const sheetScraps = useMemo(() => scraps.filter((s) => s.kind === "LOG"), [scraps]);

  // Apply filters
  const filteredShelfScraps = useMemo(() => {
    return filterScraps(shelfScraps, filters);
  }, [shelfScraps, filters]);

  const filteredSheetScraps = useMemo(() => {
    return filterScraps(sheetScraps, filters);
  }, [sheetScraps, filters]);

  const hasActiveFilters =
    !!filters.query ||
    (filters.kind && filters.kind !== "ALL") ||
    !!filters.tag ||
    !!filters.date ||
    (filters.status && filters.status !== "all");

  return (
    <AppPage width="wide">
      <div className="scratch-page-root">
        <div className="scratch-wrap">
          {/* ── TOP HEADER & VIEW SWITCHER ── */}
          <div className="top">
            <div>
              <h1>Scratch</h1>
              <div className="sub">
                TWO ZONES. THE SHEET HOLDS WHAT HAPPENED — CLOSED ON ARRIVAL, SINKS INTO ITS DAY. THE SHELF HOLDS WHAT&apos;S OPEN — QUESTIONS, BUGS, DRAFTS — UNTIL IT PROMOTES, RESOLVES, OR COMPOSTS. NOTHING IS EVER FILED.
              </div>
            </div>
            <div className="views" id="views">
              <button
                type="button"
                data-v="stream"
                aria-pressed={viewMode === "stream"}
                onClick={() => {
                  playSound.click();
                  setViewMode("stream");
                }}
              >
                STREAM
              </button>
              <button
                type="button"
                data-v="pinned"
                aria-pressed={viewMode === "pinned"}
                onClick={() => {
                  playSound.click();
                  setViewMode("pinned");
                }}
                className={pinnedCount > 0 ? "has-pinned-items" : ""}
                title="Dedicated Pinned Notes Pinboard"
              >
                📎 PINNED {pinnedCount > 0 ? `(${pinnedCount})` : ""}
              </button>
              <button
                type="button"
                data-v="logbook"
                aria-pressed={viewMode === "logbook"}
                onClick={() => {
                  playSound.click();
                  setViewMode("logbook");
                }}
              >
                LOGBOOK
              </button>
              <button
                type="button"
                data-v="corkboard"
                aria-pressed={viewMode === "corkboard"}
                onClick={() => {
                  playSound.click();
                  setViewMode("corkboard");
                }}
              >
                📌 CORKBOARD
              </button>
            </div>
          </div>

          {/* ── TOAST NOTIFICATION ── */}
          {feedback && (
            <div
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                background: "var(--ink)",
                color: "var(--yellow)",
                fontFamily: "var(--mono)",
                fontSize: "12px",
                fontWeight: 800,
                padding: "12px 18px",
                border: "var(--b) solid var(--pink)",
                boxShadow: "4px 4px 0 var(--pink)",
                zIndex: 99999,
              }}
            >
              {feedback}
            </div>
          )}

          {/* ── THE SLAB (CAPTURE BAR) ── */}
          <ScratchSlab
            onFile={handleFileScrap}
            existingScraps={collisionCandidates}
            onWeldCandidate={handleWeldFromSlab}
            submitting={submitting}
          />

          {/* ── FILTER, SEARCH & CATEGORY BAR ── */}
          <ScratchFilterBar
            scraps={scraps}
            totalCount={scraps.length}
            filteredCount={filteredShelfScraps.length + filteredSheetScraps.length}
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />

          {/* ── MAIN CONTENT (STREAM OR LOGBOOK) ── */}
          {loading ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                fontFamily: "var(--mono)",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              LOADING SCRATCH MEMORY...
            </div>
          ) : viewMode === "stream" ? (
            /* ═══ STREAM VIEW: SHELF + SHEET RAIL + SIDE PANELS ═══ */
            <div className="stream" id="streamView">
              {/* THE SHELF */}
              <div>
                {seanceScrap && (
                  <ScratchSeance
                    scrap={seanceScrap}
                    onRestore={handleRestoreSeance}
                    onDismiss={() => setSeanceScrap(null)}
                  />
                )}
                <div className="zone">
                  <div className="zone__head">
                    <b>The Shelf</b>
                    <i>{shelfScraps.length} OPEN</i>
                    <span className="zone__bar" />
                  </div>
                  <div className="zone__rule">
                    LEAVES ONLY BY PROMOTING, RESOLVING, OR COMPOSTING — THERE IS NO &quot;PUT AWAY&quot;.
                  </div>
                </div>
                <ScratchFeed
                  scraps={filteredShelfScraps}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetFilters}
                  onUpdateNotes={handleUpdateNotes}
                  onPromoteTil={handlePromoteTil}
                  onPromoteTodo={handlePromoteTodo}
                  onWeld={handleOpenWeldModal}
                  onBury={handleBury}
                  onTogglePin={handleTogglePin}
                />
              </div>

              {/* SHEET RAIL */}
              <div className="rail">
                <div className="zone">
                  <div className="zone__head">
                    <b>The Sheet</b>
                    <i>TODAY</i>
                    <span className="zone__bar" />
                  </div>
                </div>
                <ScratchSheet
                  scraps={filteredSheetScraps}
                  isRail={true}
                  onTagClick={(tag) => handleFilterChange({ tag })}
                />
              </div>

              {/* SIDE PANELS */}
              <ScratchSidePanels
                scraps={scraps}
                stats={stats}
                mode="stream"
                selectedTag={filters.tag || null}
                onSelectTag={(tag) => handleFilterChange({ tag })}
                onSelectQuestion={handleSelectQuestion}
                onBuryCompost={handleBuryCompost}
                onKeepCompost={handleKeepCompost}
              />
            </div>
          ) : viewMode === "pinned" ? (
            /* ═══ PINNED VIEW: DEDICATED PINBOARD & DOCKET ═══ */
            <ScratchPinnedView
              scraps={scraps}
              onUpdateNotes={handleUpdateNotes}
              onPromoteTil={handlePromoteTil}
              onPromoteTodo={handlePromoteTodo}
              onWeld={handleOpenWeldModal}
              onBury={handleBury}
              onTogglePin={handleTogglePin}
            />
          ) : viewMode === "corkboard" ? (
            /* ═══ CORKBOARD VIEW: PINNED SCRAPS ON A DRAGGABLE CANVAS ═══ */
            <ScratchCorkboard
              scraps={scraps}
              onUpdateNotes={handleUpdateNotes}
              onPromoteTil={handlePromoteTil}
              onTogglePin={handleTogglePin}
              onUpdatePosition={handleUpdatePosition}
            />
          ) : (
            /* ═══ LOGBOOK VIEW: YEAR WALL + FULL SHEET + LOGBOOK SIDE PANELS ═══ */
            <div className="logbook on" id="logbookView">
              <ScratchYearWall
                scraps={scraps}
                onSelectDate={(date) => handleFilterChange({ date })}
              />

              <div className="lb">
                <div>
                  <div className="zone">
                    <div className="zone__head">
                      <b>The Sheet</b>
                      <i>{sheetScraps.length} TOTAL LOGGED</i>
                      <span className="zone__bar" />
                    </div>
                  </div>
                  <ScratchSheet
                    scraps={filteredSheetScraps}
                    isRail={false}
                    onTagClick={(tag) => handleFilterChange({ tag })}
                  />
                </div>

                <ScratchSidePanels
                  scraps={scraps}
                  stats={stats}
                  mode="logbook"
                  selectedTag={filters.tag || null}
                  onSelectTag={(tag) => handleFilterChange({ tag })}
                  onSelectQuestion={handleSelectQuestion}
                  onBuryCompost={handleBuryCompost}
                  onKeepCompost={handleKeepCompost}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── WELD MODAL ── */}
        <ScratchWeldModal
          isOpen={isWeldModalOpen}
          targetScrap={weldTargetScrap}
          otherScraps={scraps}
          onClose={() => setIsWeldModalOpen(false)}
          onConfirmWeld={handleConfirmWeld}
        />
      </div>
    </AppPage>
  );
}

export default function ScratchPage() {
  return (
    <Suspense fallback={<AppLoading label="LOADING SCRATCH PAGE..." />}>
      <ScratchPageContent />
    </Suspense>
  );
}
