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
import { GridView } from "@/components/views/GridView";
import { ListView } from "@/components/views/ListView";
import { HeadlinesView } from "@/components/views/HeadlinesView";
import { ArchiveView } from "@/components/views/ArchiveView";
import { ColdStart } from "@/components/ColdStart";
import { GhostReaderModal } from "@/components/library/GhostReaderModal";
import { AppLoading } from "@/components/chrome/AppLoading";
import { AppPage } from "@/components/chrome/AppPage";
import { ChromeSlot } from "@/components/chrome/slots";
import { Bookmark } from "@/types";
import { TilType } from "@/db/schema";
import { usePWA } from "@/components/PWAProvider";
import { Menu } from "lucide-react";

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
  const [ghostReaderBookmark, setGhostReaderBookmark] = useState<Bookmark | null>(null);
  const [dischargeTarget, setDischargeTarget] = useState<Bookmark | null>(null);
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

  const handleOpenDischargeModal = useCallback((bookmark: Bookmark) => {
    setDischargeTarget(bookmark);
  }, []);

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
        unread: true,
        itemType: "REFERENCE",
        itemTypeGuessed: false,
        note: quoteText,
        ex: { ...parent.ex, quote: "true" },
      });
    },
    [bookmarks, addBookmark]
  );

  const handleDischargeSubmit = React.useCallback(
    async (input: { type: TilType; body: string; tags: string[] }) => {
      if (!dischargeTarget) return;
      await dischargeBookmark(dischargeTarget.id, input);
    },
    [dischargeTarget, dischargeBookmark]
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
    setQuery("");
    setUnreadOnly(false);
    setNeverOpenedOnly(false);
  }, [setColl, setTy, setTag, setQuery, setUnreadOnly, setNeverOpenedOnly]);

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
            <Menu size={14} /> <span className="mobile-menu-btn-label">MENU</span>
          </button>
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
            ) : view === "grid" || view === "masonry" ? (
              <GridView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onToggleRead={toggleReadStatus}
                onRecordUse={recordBookmarkUse}
                onSelectTag={(t) => setTag(tag === t ? null : t)}
                onOpenDiff={handleOpenDiffModal}
                onDischarge={handleOpenDischargeModal}
                onGhostRead={(bm) => setGhostReaderBookmark(bm)}
              />
            ) : view === "list" ? (
              <ListView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onToggleRead={toggleReadStatus}
                onRecordUse={recordBookmarkUse}
                onSelectTag={(t) => setTag(tag === t ? null : t)}
                onGhostRead={(bm) => setGhostReaderBookmark(bm)}
                onDischarge={handleOpenDischargeModal}
              />
            ) : (
              <HeadlinesView
                items={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onOpen={(id) => setOpenId(id)}
                onToggleRead={toggleReadStatus}
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

        {/* 💡 Log TIL Note from Bookmark Modal */}
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
      </div>
    </AppPage>
  );
}
