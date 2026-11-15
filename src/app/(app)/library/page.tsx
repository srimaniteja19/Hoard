"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Sidebar } from "@/components/Sidebar";
import { HeaderBar } from "@/components/HeaderBar";
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
import { GhostReaderModal } from "@/components/library/GhostReaderModal";
import { TopicClusterHubModal } from "@/components/library/TopicClusterHubModal";
import { HoardGazetteModal } from "@/components/gazette/HoardGazetteModal";
import { SynapseTrailModal } from "@/components/synapse/SynapseTrailModal";
import { LivingTopicCluster } from "@/lib/library/topicClustering";
import { AppLoading } from "@/components/chrome/AppLoading";
import { AppPage } from "@/components/chrome/AppPage";
import { ChromeSlot } from "@/components/chrome/slots";
import { Bookmark } from "@/types";
import { TilType } from "@/db/schema";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { computeFlipDelta, flipArrivalTransform, formatReceiptLine } from "@/lib/til/flipAnimation";
import { usePWA } from "@/components/PWAProvider";

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
    activeTopicCluster,
    setActiveTopicCluster,
    view,
    setView,
    sort,
    setSort,
    unreadOnly,
    setUnreadOnly,
    neverOpenedOnly,
    setNeverOpenedOnly,
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
    recordBookmarkUse,
    updateNote,
    changeBookmarkCollection,
    changeBookmarkKind,
    changeBookmarkTag,
    bulkMarkRead,
    bulkDelete,
    addCollection,
    checkDrift,
    dischargeBookmark,
    restoreBookmark,
    purgeBookmark,
  } = useBookmarks();

  const { sharedContent, clearSharedContent } = usePWA();
  const [captureUrl, setCaptureUrl] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGazetteOpen, setIsGazetteOpen] = useState(false);
  const [ghostReaderBookmark, setGhostReaderBookmark] = useState<Bookmark | null>(null);
  const [topicHubCluster, setTopicHubCluster] = useState<LivingTopicCluster | null>(null);
  const [synapseBookmark, setSynapseBookmark] = useState<Bookmark | null>(null);
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

  useEffect(() => {
    if (!sharedContent) return;
    const incoming = sharedContent.url || sharedContent.text || sharedContent.title || "";
    if (incoming || sharedContent.action === "capture" || sharedContent.action === "stash") {
      const timer = setTimeout(() => {
        if (incoming) setCaptureUrl(incoming);
        setIsCaptureOpen(true);
        clearSharedContent();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sharedContent, clearSharedContent, setIsCaptureOpen]);

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

  const handleOpenDischargeModal = useCallback(
    (bookmark: Bookmark, sourceRect?: DOMRect) => {
      setDischargeTarget(bookmark);
      setDischargeSourceRect(sourceRect ?? null);
    },
    []
  );

  const handleSaveQuoteBookmark = useCallback(
    async (parentId: number, quoteText: string) => {
      const parent = bookmarks.find((b) => b.id === parentId);
      if (!parent) return;
      const excerpt = quoteText.length > 70 ? `${quoteText.slice(0, 70)}...` : quoteText;
      await addBookmark({
        t: `"${excerpt}"`,
        ty: parent.ty,
        src: parent.src,
        url: parent.url,
        mins: 0,
        tag: parent.tag,
        coll: parent.coll,
        unread: false,
        itemType: "REFERENCE",
        itemTypeGuessed: false,
        note: quoteText,
        ex: { ...parent.ex, quote: "true" },
      });
    },
    [bookmarks, addBookmark]
  );

  const handleCreateCollectionFromCluster = useCallback(
    async (cluster: LivingTopicCluster) => {
      await addCollection({
        name: cluster.title,
        ic: cluster.icon || "🏷️",
        c: cluster.color || "#00F0FF",
      });
    },
    [addCollection]
  );

  const handleDischargeSubmit = React.useCallback(
    async (input: { type: TilType; body: string; tags: string[] }) => {
      if (!dischargeTarget) return;
      const target = dischargeTarget;
      const sourceRect = dischargeSourceRect;

      await dischargeBookmark(target.id, input);

      const unreadBalance = bookmarks.filter((b) => b.unread && b.id !== target.id).length;
      setDischargeReceiptLines((prev) =>
        [formatReceiptLine(target.t, unreadBalance), ...prev].slice(0, 10)
      );

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
            {
              id: flyerId,
              rect: sourceRect,
              title: target.t,
              arrivalTransform: flipArrivalTransform(delta),
            },
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaptureUrl("");
      setIsCaptureOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (sharedUrl) {
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
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsCaptureOpen(false);
        setIsNewFolderOpen(false);
        setIsImportOpen(false);
        setIsMobileSidebarOpen(false);
        setIsDiffOpen(false);
        setOpenId(null);
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsCaptureOpen, setIsNewFolderOpen, setOpenId, setIsDiffOpen]);

  const handleResetFilters = useCallback(() => {
    setColl("all");
    setTy(null);
    setTag(null);
    setActiveTopicCluster(null);
    setQuery("");
    setUnreadOnly(false);
    setNeverOpenedOnly(false);
  }, [setColl, setTy, setTag, setActiveTopicCluster, setQuery, setUnreadOnly, setNeverOpenedOnly]);

  if (!isLoaded) {
    return <AppLoading />;
  }

  const guessedCount = bookmarks.filter((b) => b.itemTypeGuessed).length;

  return (
    <AppPage variant="flush">
      <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <ChromeSlot name="leading">
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Open navigation menu"
          >
            <span>☰</span> <span className="mobile-menu-btn-label">MENU</span>
          </button>
        </ChromeSlot>
        <ChromeSlot name="footer">
          <StatusLine bookmarks={bookmarks} />
        </ChromeSlot>

        {/* Left Workbench Sidebar Rail */}
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
          neverOpenedOnly={neverOpenedOnly}
          setNeverOpenedOnly={setNeverOpenedOnly}
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
          activeTopicCluster={activeTopicCluster}
          setActiveTopicCluster={setActiveTopicCluster}
          onOpenTopicHub={(cluster) => setTopicHubCluster(cluster)}
          onOpenGazette={() => setIsGazetteOpen(true)}
          dischargeCount={dischargeCount}
          dischargePulseNonce={dischargePulseNonce}
          dischargeReducedMotion={dischargeReducedMotion}
        />

        {/* Main Workbench Content Area */}
        <main className="main">
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
            bookmarks={bookmarks}
            filteredCount={filteredBookmarks.length}
            collections={collections}
            coll={coll}
            setColl={setColl}
            ty={ty}
            setTy={setTy}
            tag={tag}
            setTag={setTag}
            activeTopicCluster={activeTopicCluster}
            setActiveTopicCluster={setActiveTopicCluster}
            unreadOnly={unreadOnly}
            setUnreadOnly={setUnreadOnly}
            neverOpenedOnly={neverOpenedOnly}
            setNeverOpenedOnly={setNeverOpenedOnly}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
            guessedCount={guessedCount}
            onResetFilters={handleResetFilters}
          />

          <div
            className={`scroll ${bookmarks.length > 0 && bookmarks.length < 15 ? "cold-start-view" : ""}`}
          >
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
                onRecordUse={recordBookmarkUse}
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
                    fontSize: "15px",
                    background: "var(--paper)",
                    border: "2px solid var(--ink)",
                    boxShadow: "3px 3px 0 var(--ink)",
                    padding: "6px 16px",
                    marginBottom: "10px",
                  }}
                >
                  NO MATCHING BOOKMARKS
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11.5px",
                    color: "var(--fg)",
                    opacity: 0.72,
                    marginBottom: "16px",
                  }}
                >
                  No saved items match the active filter or search query.
                </div>
                <button
                  onClick={handleResetFilters}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 800,
                    border: "2px solid var(--ink)",
                    background: "var(--yel)",
                    color: "#000",
                    padding: "7px 14px",
                    cursor: "pointer",
                    boxShadow: "2px 2px 0 var(--ink)",
                  }}
                >
                  ← CLEAR FILTERS & VIEW ALL
                </button>
              </div>
            ) : view === "masonry" ? (
              <MasonryView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onRecordUse={recordBookmarkUse}
                onSelectTag={(t) => setTag(tag === t ? null : t)}
                onOpenDiff={handleOpenDiffModal}
                onDischarge={handleOpenDischargeModal}
                onGhostRead={(bm) => setGhostReaderBookmark(bm)}
                onOpenSynapse={(bm) => setSynapseBookmark(bm)}
              />
            ) : view === "grid" ? (
              <GridView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onRecordUse={recordBookmarkUse}
                onSelectTag={(t) => setTag(tag === t ? null : t)}
                onOpenDiff={handleOpenDiffModal}
                onDischarge={handleOpenDischargeModal}
                onGhostRead={(bm) => setGhostReaderBookmark(bm)}
                onOpenSynapse={(bm) => setSynapseBookmark(bm)}
              />
            ) : view === "list" ? (
              <ListView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onRecordUse={recordBookmarkUse}
                onSelectTag={(t) => setTag(tag === t ? null : t)}
                onGhostRead={(bm) => setGhostReaderBookmark(bm)}
                onDischarge={handleOpenDischargeModal}
                onOpenSynapse={(bm) => setSynapseBookmark(bm)}
              />
            ) : (
              <HeadlinesView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onRecordUse={recordBookmarkUse}
                onSelectTag={(t) => setTag(tag === t ? null : t)}
                onGhostRead={(bm) => setGhostReaderBookmark(bm)}
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
            onChangeTag={changeBookmarkTag}
            onAddChapter={addChapter}
            onCheckDrift={checkDrift}
            onOpenDiff={handleOpenDiffModal}
            onSelectBookmark={(id) => setOpenId(id)}
            onRecordUse={recordBookmarkUse}
            onOpenGhostReader={(bm) => setGhostReaderBookmark(bm)}
            onOpenSynapse={(bm) => setSynapseBookmark(bm)}
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
          onRecordUse={recordBookmarkUse}
        />

        {/* 💡 Discharge: turn a queued bookmark into the TIL entry it produced */}
        <DischargeModal
          bookmark={dischargeTarget}
          onClose={() => setDischargeTarget(null)}
          onSubmit={handleDischargeSubmit}
        />

        {/* ⚡ Ghost Reader Modal */}
        <GhostReaderModal
          bookmark={ghostReaderBookmark}
          onClose={() => setGhostReaderBookmark(null)}
          onToggleRead={toggleReadStatus}
          onDischargeQuote={(quote, bm) => {
            setDischargeTarget({ ...bm, note: quote });
          }}
          onDischargeFull={(bm) => {
            setDischargeTarget(bm);
          }}
          onSaveQuoteBookmark={handleSaveQuoteBookmark}
          onRecordUse={recordBookmarkUse}
        />

        {/* 🏷️ Living Topic Cluster Hub Modal */}
        <TopicClusterHubModal
          cluster={topicHubCluster}
          onClose={() => setTopicHubCluster(null)}
          onOpenBookmark={(id) => setOpenId(id)}
          onGhostRead={(bm) => setGhostReaderBookmark(bm)}
          onToggleRead={toggleReadStatus}
          onDischarge={handleOpenDischargeModal}
          onCreateCollectionFromCluster={handleCreateCollectionFromCluster}
        />

        {/* 📰 The Hoard Gazette Weekly Micro-Zine Modal */}
        <HoardGazetteModal
          isOpen={isGazetteOpen}
          bookmarks={bookmarks}
          onClose={() => setIsGazetteOpen(false)}
          onOpenBookmark={(id) => setOpenId(id)}
          onGhostRead={(bm) => setGhostReaderBookmark(bm)}
          onDischarge={handleOpenDischargeModal}
        />

        {/* 🌌 Synapse Trail (Semantic Serendipity) Modal */}
        <SynapseTrailModal
          targetBookmark={synapseBookmark}
          allBookmarks={bookmarks}
          onClose={() => setSynapseBookmark(null)}
          onOpenBookmark={(id) => setOpenId(id)}
          onGhostRead={(bm) => setGhostReaderBookmark(bm)}
          onDischarge={handleOpenDischargeModal}
        />

        {/* Discharge FLIP flyers */}
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

        {/* Discharge receipt */}
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
