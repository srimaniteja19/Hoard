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
import { ScrapRow } from "@/db/schema";
import { ScratchStats } from "@/lib/dal/scratch";
import { CollisionCandidate, CollisionHit } from "@/lib/scratch/collision";
import { ScratchFilters, filterScraps } from "@/lib/scratch/filters";
import { playSound } from "@/lib/sound";

function ScratchPageContent() {
  const [scraps, setScraps] = useState<ScrapRow[]>([]);
  const [stats, setStats] = useState<ScratchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"stream" | "logbook">("stream");

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
  const handleFileScrap = async (text: string) => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/scratch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const created: ScrapRow = await res.json();
        setScraps((prev) => [created, ...prev]);
        showToast(created.kind === "LOG" ? "✓ Log filed to The Sheet" : "✓ Scrap filed to The Shelf");
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
      const res = await fetch("/api/scratch/weld", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId }),
      });

      if (res.ok) {
        const { updatedTarget } = await res.json();
        setScraps((prev) =>
          prev
            .filter((s) => s.id !== sourceId)
            .map((s) => (s.id === targetId ? { ...s, ...updatedTarget } : s))
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

  // 11. Scroll to question scrap
  const handleSelectQuestion = (scrapId: string) => {
    const el = document.getElementById(`scrap-${scrapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("open");
    }
  };

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
                data-v="logbook"
                aria-pressed={viewMode === "logbook"}
                onClick={() => {
                  playSound.click();
                  setViewMode("logbook");
                }}
              >
                LOGBOOK
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
                <div className="zone">
                  <b>The Shelf</b>
                  <i>{shelfScraps.length} OPEN</i>
                  <span />
                  <span className="rule">
                    LEAVES ONLY BY PROMOTING, RESOLVING, OR COMPOSTING — THERE IS NO &quot;PUT AWAY&quot;.
                  </span>
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
                />
              </div>

              {/* SHEET RAIL */}
              <div className="rail">
                <div className="zone">
                  <b>The Sheet</b>
                  <i>TODAY</i>
                  <span />
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
                    <b>The Sheet</b>
                    <i>{sheetScraps.length} TOTAL LOGGED</i>
                    <span />
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
