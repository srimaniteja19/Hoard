"use client";

import React, { useRef, useEffect, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Sidebar } from "@/components/Sidebar";
import { HeaderBar } from "@/components/HeaderBar";
import { CrumbBar } from "@/components/CrumbBar";
import { TimeContextBar } from "@/components/TimeContextBar";
import { BulkActionBar } from "@/components/BulkActionBar";
import { InspectorDrawer } from "@/components/InspectorDrawer";
import { CaptureModal } from "@/components/CaptureModal";
import { NewFolderModal } from "@/components/NewFolderModal";
import { ImportModal } from "@/components/ImportModal";
import { DiffViewerModal } from "@/components/DiffViewerModal";
import { DischargeModal } from "@/components/DischargeModal";
import { MasonryView } from "@/components/views/MasonryView";
import { GridView } from "@/components/views/GridView";
import { ListView } from "@/components/views/ListView";
import { HeadlinesView } from "@/components/views/HeadlinesView";
import { ArchiveView } from "@/components/views/ArchiveView";
import { StatusLine } from "@/components/StatusLine";
import { ColdStart } from "@/components/ColdStart";
import { AppLoading } from "@/components/chrome/AppLoading";
import { AppPage } from "@/components/chrome/AppPage";
import { ChromeSlot } from "@/components/chrome/slots";
import { Bookmark } from "@/types";
import { TilType } from "@/db/schema";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { computeFlipDelta, flipArrivalTransform, formatReceiptLine } from "@/lib/til/flipAnimation";

export default function Home() {
  const {
    bookmarks,
    collections,
    filteredBookmarks,
    isLoaded,
    query,
    setQuery,
    coll,
    setColl,
    ty,
    setTy,
    tag,
    setTag,
    time,
    setTime,
    ctx,
    setCtx,
    view,
    setView,
    sort,
    setSort,
    unreadOnly,
    setUnreadOnly,
    selectedIds,
    toggleSelect,
    clearSelection,
    setOpenId,
    openBookmark,
    isCaptureOpen,
    setIsCaptureOpen,
    isNewFolderOpen,
    setIsNewFolderOpen,
    isDiffOpen,
    setIsDiffOpen,
    diffBookmark,
    setDiffBookmark,
    addBookmark,
    addChapter,
    toggleReadStatus,
    updateNote,
    changeBookmarkCollection,
    changeBookmarkKind,
    bulkMarkRead,
    bulkDelete,
    addCollection,
    checkDrift,
    dischargeBookmark,
    restoreBookmark,
    purgeBookmark,
  } = useBookmarks();

  const [captureUrl, setCaptureUrl] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dischargeTarget, setDischargeTarget] = useState<Bookmark | null>(null);
  const [dischargeSourceRect, setDischargeSourceRect] = useState<DOMRect | null>(null);
  const [dischargeCount, setDischargeCount] = useState(0);
  const [dischargePulseNonce, setDischargePulseNonce] = useState(0);
  const [dischargeFlyers, setDischargeFlyers] = useState<
    Array<{ id: string; rect: DOMRect; title: string; arrivalTransform: string }>
  >([]);
  const [dischargeReceiptLines, setDischargeReceiptLines] = useState<string[]>([]);
  const dischargeReducedMotion = useReducedMotion();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenCaptureWithUrl = React.useCallback(
    (url: string) => {
      setCaptureUrl(url);
      setIsCaptureOpen(true);
    },
    [setIsCaptureOpen]
  );

  const handleOpenDiffModal = React.useCallback(
    (bm: Bookmark) => {
      setDiffBookmark(bm);
      setIsDiffOpen(true);
    },
    [setDiffBookmark, setIsDiffOpen]
  );

  const handleOpenDischargeModal = React.useCallback((bm: Bookmark, sourceRect: DOMRect) => {
    setDischargeTarget(bm);
    setDischargeSourceRect(sourceRect);
  }, []);

  const handleDischargeSubmit = React.useCallback(
    async (input: { type: TilType; body: string; tags: string[] }) => {
      if (!dischargeTarget) return;
      const target = dischargeTarget;
      const sourceRect = dischargeSourceRect;

      await dischargeBookmark(target.id, input);

      // Real balance, not a hardcoded string — one fewer unread than before
      // this discharge, since dischargeBookmark already flipped it locally.
      const unreadBalance = bookmarks.filter((b) => b.unread && b.id !== target.id).length;
      setDischargeReceiptLines((prev) => [formatReceiptLine(target.t, unreadBalance), ...prev].slice(0, 10));

      setDischargeCount((c) => c + 1);
      setDischargePulseNonce((n) => n + 1);

      if (!dischargeReducedMotion && sourceRect) {
        const destEl = document.getElementById("til-gains-counter");
        const destRect = destEl?.getBoundingClientRect();
        if (destRect) {
          const delta = computeFlipDelta(sourceRect, destRect);
          const flyerId = `${target.id}-${Date.now()}`;
          setDischargeFlyers((prev) => [
            ...prev,
            { id: flyerId, rect: sourceRect, title: target.t, arrivalTransform: flipArrivalTransform(delta) },
          ]);
          setTimeout(() => {
            setDischargeFlyers((prev) => prev.filter((f) => f.id !== flyerId));
          }, 420);
        }
      }
    },
    [dischargeTarget, dischargeSourceRect, dischargeBookmark, bookmarks, dischargeReducedMotion]
  );

  // Web Share Target & Query Parameter Listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url") || params.get("text") || "";
    const action = params.get("action");

    if (action === "capture") {
      // Must run post-mount: window.location is unavailable during SSR, so this
      // can't be a lazy useState initializer without a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaptureUrl("");
      setIsCaptureOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (sharedUrl) {
      // Find URL match if text contains extra string
      const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/i);
      const targetUrl = urlMatch ? urlMatch[0] : sharedUrl;
      if (/^https?:\/\//i.test(targetUrl.trim())) {
        handleOpenCaptureWithUrl(targetUrl.trim());
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [setIsCaptureOpen, handleOpenCaptureWithUrl]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setCaptureUrl("");
        setIsCaptureOpen(true);
      }
      if (e.key === "Escape") {
        setIsCaptureOpen(false);
        setIsNewFolderOpen(false);
        setIsImportOpen(false);
        setIsMobileSidebarOpen(false);
        setIsDiffOpen(false);
        setOpenId(null);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsCaptureOpen, setIsNewFolderOpen, setOpenId, setIsDiffOpen]);

  if (!isLoaded) {
    return <AppLoading />;
  }

  return (
    <AppPage variant="flush">
    <div className="app-container">
      <ChromeSlot name="leading">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          aria-label="Open navigation menu"
        >
          <span>☰</span> MENU
        </button>
      </ChromeSlot>
      <ChromeSlot name="toolbar">
        <HeaderBar
          query={query}
          setQuery={setQuery}
          view={view}
          setView={setView}
          sort={sort}
          setSort={setSort}
          onOpenCaptureWithUrl={handleOpenCaptureWithUrl}
          searchInputRef={searchInputRef}
          onOpenCapture={() => {
            setCaptureUrl("");
            setIsCaptureOpen(true);
          }}
        />
      </ChromeSlot>
      <ChromeSlot name="footer">
        <StatusLine bookmarks={bookmarks} />
      </ChromeSlot>
      {/* Sidebar */}
      <Sidebar
        bookmarks={bookmarks}
        collections={collections}
        coll={coll}
        setColl={setColl}
        ty={ty}
        setTy={setTy}
        tag={tag}
        setTag={setTag}
        unreadOnly={unreadOnly}
        setUnreadOnly={setUnreadOnly}
        view={view}
        setView={setView}
        onOpenCapture={() => {
          setCaptureUrl("");
          setIsCaptureOpen(true);
        }}
        onOpenNewFolder={() => setIsNewFolderOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        dischargeCount={dischargeCount}
        dischargePulseNonce={dischargePulseNonce}
        dischargeReducedMotion={dischargeReducedMotion}
      />

      {/* Main Content Area */}
      <main className="main">
        <CrumbBar
          items={filteredBookmarks}
          coll={coll}
          ty={ty}
        />

        <TimeContextBar
          time={time}
          setTime={setTime}
          ctx={ctx}
          setCtx={setCtx}
        />

        <div className={`scroll ${bookmarks.length > 0 && bookmarks.length < 15 ? "cold-start-view" : ""}`}>
          {view === "archive" ? (
            <ArchiveView
              bookmarks={bookmarks}
              collections={collections}
              onOpen={(id) => setOpenId(id)}
              onToggleRead={(id) => toggleReadStatus(id)}
              onRestore={(id) => restoreBookmark(id)}
              onPurge={(id) => purgeBookmark(id)}
              onOpenDiff={handleOpenDiffModal}
              onDischarge={handleOpenDischargeModal}
            />
          ) : bookmarks.length === 0 ? (
            <ColdStart onOpenImport={() => setIsImportOpen(true)} />
          ) : filteredBookmarks.length === 0 ? (
            <div className="empty" style={{ padding: "60px 20px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: "18px",
                  background: "#FFE600",
                  border: "3px solid var(--ink)",
                  boxShadow: "4px 4px 0 var(--ink)",
                  padding: "6px 16px",
                  marginBottom: "12px",
                }}
              >
                NO MATCHING BOOKMARKS
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--fg)", opacity: 0.8 }}>
                No bookmarks match the current filter or search query.
              </div>
            </div>
          ) : view === "masonry" ? (
            <MasonryView
              items={filteredBookmarks}
              selectedIds={selectedIds}
              onToggleSelect={(id) => toggleSelect(id)}
              onOpen={(id) => setOpenId(id)}
              onOpenDiff={handleOpenDiffModal}
              onDischarge={handleOpenDischargeModal}
            />
          ) : view === "grid" ? (
            <GridView
              items={filteredBookmarks}
              selectedIds={selectedIds}
              onToggleSelect={(id) => toggleSelect(id)}
              onOpen={(id) => setOpenId(id)}
              onOpenDiff={handleOpenDiffModal}
              onDischarge={handleOpenDischargeModal}
            />
          ) : view === "list" ? (
            <ListView
              items={filteredBookmarks}
              selectedIds={selectedIds}
              currentTimeLimit={time}
              onToggleSelect={(id) => toggleSelect(id)}
              onOpen={(id) => setOpenId(id)}
            />
          ) : (
            <HeadlinesView
              items={filteredBookmarks}
              selectedIds={selectedIds}
              onToggleSelect={(id) => toggleSelect(id)}
              onOpen={(id) => setOpenId(id)}
            />
          )}
        </div>

        {/* Floating Bulk Actions Bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          onMarkRead={bulkMarkRead}
          onDelete={bulkDelete}
        />

        {/* Slide-over Inspector Drawer */}
        <InspectorDrawer
          bookmark={openBookmark}
          allBookmarks={bookmarks}
          collections={collections}
          onClose={() => setOpenId(null)}
          onToggleRead={toggleReadStatus}
          onUpdateNote={updateNote}
          onChangeCollection={changeBookmarkCollection}
          onChangeKind={changeBookmarkKind}
          onAddChapter={addChapter}
          onCheckDrift={checkDrift}
          onOpenDiff={handleOpenDiffModal}
          onSelectBookmark={(id) => setOpenId(id)}
        />

      </main>

      {/* Save Link Modal */}
      <CaptureModal
        isOpen={isCaptureOpen}
        collections={collections}
        bookmarks={bookmarks}
        initialUrl={captureUrl}
        onClose={() => setIsCaptureOpen(false)}
        onSave={addBookmark}
        onSelectExisting={(id) => setOpenId(id)}
      />

      {/* Create New Folder / Smart Collection Modal */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        collections={collections}
        onClose={() => setIsNewFolderOpen(false)}
        onAddCollection={addCollection}
      />

      {/* One-Click Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => window.location.reload()}
      />

      {/* ⚡ Content Drift & Preserved Copy Reader Modal */}
      <DiffViewerModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        bookmark={diffBookmark}
        onRecheckDrift={checkDrift}
      />

      {/* 💡 Discharge: turn a queued bookmark into the TIL entry it produced */}
      <DischargeModal
        bookmark={dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        onSubmit={handleDischargeSubmit}
      />

      {/* Discharge FLIP flyers — one per in-flight discharge, independently
          timed and removed, so rapid discharges never collide (SPECTACLE.md §4). */}
      {dischargeFlyers.map((f) => (
        <div
          key={f.id}
          className="discharge-flyer"
          style={
            {
              position: "fixed",
              left: f.rect.left,
              top: f.rect.top,
              width: f.rect.width,
              zIndex: 999,
              pointerEvents: "none",
              border: "var(--bd)",
              background: "var(--yel, #FFE600)",
              boxShadow: "var(--sh)",
              padding: "10px 12px",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "var(--grot)",
              color: "#000",
              "--flyer-start": "translate(0px, 0px) scale(1) rotate(0deg)",
              "--flyer-end": f.arrivalTransform,
            } as React.CSSProperties
          }
        >
          {f.title}
        </div>
      ))}

      {/* Discharge receipt — running log printed from real state, newest first. */}
      {dischargeReceiptLines.length > 0 && (
        <div
          className="discharge-receipt"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10.5px",
            fontWeight: 700,
            border: "2px dashed var(--ink)",
            background: "var(--cream)",
            color: "var(--ink)",
            padding: "9px 11px",
            lineHeight: 1.7,
          }}
        >
          {dischargeReceiptLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
    </AppPage>
  );
}
