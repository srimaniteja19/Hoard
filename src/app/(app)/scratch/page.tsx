"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { ScratchSlab } from "@/components/scratch/ScratchSlab";
import { ScratchFeed } from "@/components/scratch/ScratchFeed";
import { ScratchSidePanels } from "@/components/scratch/ScratchSidePanels";
import { ScratchWeldModal } from "@/components/scratch/ScratchWeldModal";
import { ScrapRow } from "@/db/schema";
import { ScratchStats } from "@/lib/dal/scratch";
import { CollisionCandidate, CollisionHit } from "@/lib/scratch/collision";

function ScratchPageContent() {
  const [scraps, setScraps] = useState<ScrapRow[]>([]);
  const [stats, setStats] = useState<ScratchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      // silent — stats refresh is best-effort
    }
  }, []);

  useEffect(() => {
    void fetchScraps();
  }, [fetchScraps]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
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
        showToast("✓ Scrap filed to stream");
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
        showToast("✓ Filed to Todos");
        void refreshStats();
      }
    } catch (err) {
      console.error("Failed to promote to Todo", err);
    }
  };

  // 5. Open weld modal
  const handleOpenWeldModal = (id: string) => {
    const target = scraps.find((s) => s.id === id) || null;
    if (target) {
      setWeldTargetScrap(target);
      setIsWeldModalOpen(true);
    }
  };

  // 6. Confirm weld action
  const handleConfirmWeld = async (targetId: string, sourceIdOrText: string) => {
    try {
      const res = await fetch(`/api/scratch/${targetId}/weld`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: sourceIdOrText }),
      });

      if (res.ok) {
        const updated: ScrapRow = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === targetId ? { ...s, ...updated } : s)));
        showToast("✓ Scraps welded together");
      }
    } catch (err) {
      console.error("Failed to weld scrap", err);
    }
  };

  // 7. Weld directly from Slab collision hit
  const handleWeldFromSlab = async (hit: CollisionHit, currentSlabText: string) => {
    if (currentSlabText.trim()) {
      // First file the slab text, then weld
      const res = await fetch("/api/scratch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentSlabText.trim() }),
      });

      if (res.ok) {
        const created: ScrapRow = await res.json();
        await handleConfirmWeld(created.id, hit.content.slice(0, 40));
        void refreshStats();
      }
    } else {
      handleOpenWeldModal(hit.id);
    }
  };

  // 8. Bury single scrap
  const handleBury = async (id: string) => {
    try {
      const res = await fetch(`/api/scratch/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBuried: true, status: "compost", statusLabel: "BURIED" }),
      });

      if (res.ok) {
        setScraps((prev) => prev.filter((s) => s.id !== id));
        showToast("✓ Scrap buried");
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

  return (
    <AppPage width="wide">
      <div className="scratch-page-root">
        <div className="scratch-wrap">
          {/* ── TOP HEADER & STATS ── */}
          <div className="scratch-top">
            <div>
              <h1>Scratch</h1>
              <div className="sub">
                Half-thoughts, questions, and things you&apos;d lose otherwise. Nothing
                here has to be finished — that&apos;s what TIL is for. Add notes to any
                scrap when it starts turning into something.
              </div>
            </div>
            <div className="scratch-mini">
              <span>
                THIS WEEK <b>{stats?.thisWeek ?? 14}</b>
              </span>
              <span>
                PROMOTED <b>{stats?.promoted ?? 5}</b>
              </span>
              <span>
                OPEN QUESTIONS <b>{stats?.openQuestions ?? 7}</b>
              </span>
              <span className="warn">
                GOING COLD <b>{stats?.goingCold ?? 9}</b>
              </span>
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

          {/* ── MAIN CONTENT (FEED + SIDE PANELS) ── */}
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
          ) : (
            <div className="scratch-cols">
              <ScratchFeed
                scraps={scraps}
                onUpdateNotes={handleUpdateNotes}
                onPromoteTil={handlePromoteTil}
                onPromoteTodo={handlePromoteTodo}
                onWeld={handleOpenWeldModal}
                onBury={handleBury}
              />

              <ScratchSidePanels
                stats={stats}
                onSelectQuestion={handleSelectQuestion}
                onBuryCompost={handleBuryCompost}
                onKeepCompost={handleKeepCompost}
              />
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
