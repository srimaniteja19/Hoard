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
import { FocusModeModal } from "@/components/FocusModeModal";
import { DiffViewerModal } from "@/components/DiffViewerModal";
import { MasonryView } from "@/components/views/MasonryView";
import { GridView } from "@/components/views/GridView";
import { ListView } from "@/components/views/ListView";
import { HeadlinesView } from "@/components/views/HeadlinesView";
import { Bookmark } from "@/types";

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
    isFocusOpen,
    setIsFocusOpen,
    isDiffOpen,
    setIsDiffOpen,
    diffBookmark,
    setDiffBookmark,
    addBookmark,
    addChapter,
    toggleReadStatus,
    updateNote,
    changeBookmarkCollection,
    bulkMarkRead,
    bulkDelete,
    addCollection,
    checkDrift,
  } = useBookmarks();

  const [captureUrl, setCaptureUrl] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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

  // Web Share Target & Query Parameter Listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url") || params.get("text") || "";
    const action = params.get("action");

    if (action === "capture") {
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
        setIsFocusOpen(false);
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
  }, [setIsCaptureOpen, setIsNewFolderOpen, setOpenId, setIsFocusOpen, setIsDiffOpen]);

  if (!isLoaded) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100vh",
          fontFamily: "var(--mono), monospace",
          fontWeight: 800,
          fontSize: "18px",
          background: "var(--cream)",
        }}
      >
        LOADING HOARD...
      </div>
    );
  }

  return (
    <div className="app-container">
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
        onOpenCapture={() => {
          setCaptureUrl("");
          setIsCaptureOpen(true);
        }}
        onOpenNewFolder={() => setIsNewFolderOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
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
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenCapture={() => {
            setCaptureUrl("");
            setIsCaptureOpen(true);
          }}
          onOpenFocusMode={() => setIsFocusOpen(true)}
        />

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

        <div className="scroll">
          {filteredBookmarks.length === 0 ? (
            <div className="empty" style={{ padding: "60px 20px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: "18px",
                  background: "#FFE600",
                  border: "3px solid #000",
                  boxShadow: "4px 4px 0 #000",
                  padding: "6px 16px",
                  marginBottom: "12px",
                }}
              >
                YOUR HOARD IS BLANK
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#444" }}>
                Click <b>+ ADD LINK</b> in the header bar or press <kbd style={{ background: "#000", color: "#FFE600", padding: "2px 6px", fontFamily: "var(--mono)", fontSize: "11px" }}>Cmd + N</kbd> to save your first bookmark.
              </div>
            </div>
          ) : view === "masonry" ? (
            <MasonryView
              items={filteredBookmarks}
              selectedIds={selectedIds}
              onToggleSelect={(id) => toggleSelect(id)}
              onOpen={(id) => setOpenId(id)}
              onOpenDiff={handleOpenDiffModal}
            />
          ) : view === "grid" ? (
            <GridView
              items={filteredBookmarks}
              selectedIds={selectedIds}
              onToggleSelect={(id) => toggleSelect(id)}
              onOpen={(id) => setOpenId(id)}
              onOpenDiff={handleOpenDiffModal}
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

      {/* ⚡ Session Queue + Focus Mode Modal */}
      <FocusModeModal
        isOpen={isFocusOpen}
        onClose={() => setIsFocusOpen(false)}
        bookmarks={bookmarks}
        onToggleRead={toggleReadStatus}
      />

      {/* ⚡ Content Drift & Preserved Copy Reader Modal */}
      <DiffViewerModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        bookmark={diffBookmark}
        onRecheckDrift={checkDrift}
      />
    </div>
  );
}
