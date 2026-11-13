"use client";

import React, { useState, useEffect, useRef } from "react";
import { SeedCourse, SeedCourseLesson } from "@/lib/notebooks/seedData";
import { lessonState, computeWordCount } from "@/lib/notebooks/blocks";
import { isSameId } from "@/lib/notebooks/storage";
import { playSound } from "@/lib/sound";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  MoreHorizontal,
  CornerDownRight,
} from "lucide-react";

interface OutlineSidebarProps {
  courses: SeedCourse[];
  currentCourseIndex: number;
  currentModuleIndex: number;
  currentLessonIndex: number;
  theme?: NotebookTheme;
  onCreateSubpage?: (parentLessonId: string) => void;
  onSelectCourse: (index: number) => void;
  onSelectLesson: (moduleIndex: number, lessonIndex: number) => void;
  onDeleteLesson?: (moduleIndex: number, lessonIndex: number) => void;
  onToggleWatched?: (moduleIndex: number, lessonIndex: number) => void;
  onToggleModuleWatched?: (moduleIndex: number, watched: boolean) => void;
  onDuplicateLesson?: (moduleIndex: number, lessonIndex: number) => void;
  onCreateLessonAbove?: (moduleIndex: number, lessonIndex: number) => void;
  onCreateLessonBelow?: (moduleIndex: number, lessonIndex: number) => void;
  onReorderLesson?: (
    sourceModuleIndex: number,
    targetModuleIndex: number,
    sourceLessonIndex: number,
    targetLessonIndex: number
  ) => void;
  onCreateModule?: () => void;
  onRenameModule?: (moduleIndex: number, newTitle: string) => void;
  onDeleteModule?: (moduleIndex: number) => void;
  onNewPageInModule?: (moduleIndex: number) => void;
  onEditCourse?: () => void;
  onDeleteCourse?: () => void;
  onBackToIndex: () => void;
  onNewPage: () => void;
  onClose?: () => void;
}

export const OutlineSidebar: React.FC<OutlineSidebarProps> = ({
  courses,
  currentCourseIndex,
  currentModuleIndex,
  currentLessonIndex,
  theme = "cream",
  onCreateSubpage,
  onSelectCourse,
  onSelectLesson,
  onDeleteLesson,
  onToggleWatched,
  onToggleModuleWatched,
  onDuplicateLesson,
  onCreateLessonAbove,
  onCreateLessonBelow,
  onReorderLesson,
  onCreateModule,
  onRenameModule,
  onDeleteModule,
  onNewPageInModule,
  onEditCourse,
  onDeleteCourse,
  onBackToIndex,
  onNewPage,
  onClose,
}) => {
  const tokens = getThemeTokens(theme);
  const isDark = tokens.isDark;
  const isInk = tokens.isDark;
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [collapsedSubpages, setCollapsedSubpages] = useState<Record<string, boolean>>({});

  // Inline module renaming state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState("");

  // Hover state for modules
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  // Hover state for lessons
  const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

  // Lesson action menu popover
  const [actionMenu, setActionMenu] = useState<{
    modIdx: number;
    lesIdx: number;
    top: number;
    left: number;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActionMenu(null);
      }
    };
    if (actionMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenu]);

  // Drag and drop state
  const [draggingInfo, setDraggingInfo] = useState<{
    modIdx: number;
    lesIdx: number;
    lessonId: string;
  } | null>(null);

  const [dropTarget, setDropTarget] = useState<{
    modIdx: number;
    lesIdx: number;
    position: "before" | "after";
  } | null>(null);

  const [dragOverModuleIdx, setDragOverModuleIdx] = useState<number | null>(null);

  const course = courses[currentCourseIndex] || courses[0];
  if (!course) return null;

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;

  const writtenCount = allLessons.filter(
    (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) === "written"
  ).length;
  const unwrittenCount = allLessons.filter(
    (l) => l.watched && lessonState({ wordCount: computeWordCount(l.blocks || []) }) !== "written"
  ).length;

  const writtenPct = totalLessons > 0 ? (writtenCount / totalLessons) * 100 : 0;
  const unwrittenPct = totalLessons > 0 ? (unwrittenCount / totalLessons) * 100 : 0;

  const toggleModuleCollapse = (modId: string) => {
    playSound.click();
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleCommitModuleRename = (modIdx: number) => {
    if (editingModuleId && moduleTitleDraft.trim() && onRenameModule) {
      onRenameModule(modIdx, moduleTitleDraft.trim());
    }
    setEditingModuleId(null);
  };

  return (
    <aside
      style={{
        borderRight: `3px solid ${tokens.borderPrimary}`,
        background: tokens.sidebarBg,
        color: tokens.textPrimary,
        padding: "0 0 60px",
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        position: "relative",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      {/* Course Card Header */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: `2px solid ${tokens.borderSubtle}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: tokens.textSecondary,
            marginBottom: "6px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: course.accent || tokens.accentColor,
                display: "inline-block",
              }}
            />
            {course.provider || "COURSE"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {onEditCourse && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playSound.click();
                  onEditCourse();
                }}
                title="Edit course metadata"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "2px",
                  opacity: 0.72,
                  color: tokens.textPrimary,
                  display: "grid",
                  placeItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.72")}
              >
                <Pencil size={11} />
              </button>
            )}
            {onDeleteCourse && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playSound.click();
                  onDeleteCourse();
                }}
                title="Delete course"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "2px",
                  opacity: 0.6,
                  color: "#EF4444",
                  display: "grid",
                  placeItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
              >
                <Trash2 size={11} />
              </button>
            )}
            <span>{course.startedAt ? new Date(course.startedAt).toLocaleDateString([], { month: "short", year: "numeric" }).toUpperCase() : "COURSE"}</span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close outline drawer"
                style={{
                  border: `1.5px solid ${tokens.borderPrimary}`,
                  background: isDark ? "#242A38" : "#EBE7DC",
                  color: tokens.textPrimary,
                  cursor: "pointer",
                  padding: "2px 6px",
                  fontSize: "9px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  borderRadius: "2px",
                  marginLeft: "4px",
                }}
              >
                <span>✕</span>
                <span>CLOSE</span>
              </button>
            )}
          </div>
        </div>

        <h3
          style={{
            margin: "0 0 10px",
            fontFamily: "var(--display, sans-serif)",
            fontWeight: 800,
            fontSize: "19px",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: tokens.textPrimary,
          }}
        >
          {course.title}
        </h3>

        {courses.length > 1 && (
          <div style={{ marginBottom: "10px" }}>
            <select
              aria-label="Switch course notebook"
              value={currentCourseIndex}
              onChange={(e) => {
                playSound.click();
                onSelectCourse(Number(e.target.value));
              }}
              style={{
                width: "100%",
                padding: "5px 8px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `1.5px solid ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                color: tokens.textPrimary,
                cursor: "pointer",
              }}
            >
              {courses.map((c, idx) => (
                <option key={c.id} value={idx}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Progress Bar */}
        <div
          style={{
            height: "8px",
            border: `1.5px solid ${tokens.borderPrimary}`,
            background: tokens.cardBg,
            display: "flex",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              width: `${writtenPct}%`,
              background: "#B8F04A",
              display: "block",
            }}
          />
          <span
            style={{
              width: `${unwrittenPct}%`,
              background: "repeating-linear-gradient(45deg, #FCE94F 0 5px, rgba(0,0,0,0.3) 5px 10px)",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "9px",
            flexWrap: "wrap",
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: tokens.textSecondary,
            marginTop: "8px",
          }}
        >
          <span>{writtenCount} WRITTEN</span>
          <span>{unwrittenCount} UNWRITTEN</span>
          <span>{totalLessons} TOTAL</span>
        </div>

        {/* Quick Search Filter Bar */}
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            aria-label="Filter pages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pages…"
            style={{
              width: "100%",
              padding: "6px 9px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 600,
              border: `1.5px solid ${tokens.borderPrimary}`,
              background: tokens.cardBg,
              color: tokens.textPrimary,
            }}
          />
        </div>
      </div>

      {/* Module & Lessons Outline */}
      <div style={{ flex: 1 }}>
        {course.modules.map((mod, modIdx) => {
          const isCollapsed = Boolean(collapsedModules[mod.id]);
          const matchingLessons = mod.lessons.filter((l) =>
            !searchQuery.trim() ||
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (l.meta ? l.meta.toLowerCase().includes(searchQuery.toLowerCase()) : false)
          );

          if (matchingLessons.length === 0 && searchQuery.trim()) return null;

          const modWritten = mod.lessons.filter(
            (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) === "written"
          ).length;

          const isModuleDragOver = dragOverModuleIdx === modIdx && mod.lessons.length === 0;
          const isEditingThisModule = editingModuleId === mod.id;
          const isModHovered = hoveredModuleId === mod.id;

          return (
            <div
              key={mod.id}
              onMouseEnter={() => setHoveredModuleId(mod.id)}
              onMouseLeave={() => setHoveredModuleId(null)}
              style={{
                padding: "14px 18px 0",
                background: isModuleDragOver ? (isInk ? "rgba(252, 233, 79, 0.12)" : "rgba(252, 233, 79, 0.2)") : "transparent",
                transition: "background 0.15s ease",
              }}
              onDragOver={(e) => {
                if (draggingInfo) {
                  e.preventDefault();
                  setDragOverModuleIdx(modIdx);
                }
              }}
              onDragLeave={() => {
                if (dragOverModuleIdx === modIdx) setDragOverModuleIdx(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverModuleIdx(null);
                if (draggingInfo && onReorderLesson && mod.lessons.length === 0) {
                  onReorderLesson(draggingInfo.modIdx, modIdx, draggingInfo.lesIdx, 0);
                  setDraggingInfo(null);
                  setDropTarget(null);
                }
              }}
            >
              {/* Module Header with Clean Minimal Actions */}
              {isEditingThisModule ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    type="text"
                    autoFocus
                    value={moduleTitleDraft}
                    onChange={(e) => setModuleTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCommitModuleRename(modIdx);
                      if (e.key === "Escape") setEditingModuleId(null);
                    }}
                    onBlur={() => handleCommitModuleRename(modIdx)}
                    style={{
                      flex: 1,
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      border: `2px solid ${tokens.borderPrimary}`,
                      background: tokens.cardBg,
                      color: tokens.textPrimary,
                      padding: "4px 8px",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="nb-outline-mod-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    opacity: 0.9,
                    marginBottom: isCollapsed ? "4px" : "8px",
                    color: isInk ? "#F0EDE4" : "#0A0A0A",
                    userSelect: "none",
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${mod.title}`}
                    onClick={() => toggleModuleCollapse(mod.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      border: "none",
                      background: "transparent",
                      color: "inherit",
                      font: "inherit",
                      letterSpacing: "inherit",
                      padding: "2px 0",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    <span>{mod.title}</span>
                  </button>
                  <span style={{ flex: 1, height: "2px", background: isInk ? "rgba(255,255,255,0.15)" : "rgba(10,10,10,0.14)" }} />
                  <span style={{ fontSize: "8.5px", opacity: 0.7 }}>
                    {modWritten}/{mod.lessons.length}
                  </span>

                  {/* Module Action Icons (visible on hover, focus-within, and touch/mobile) */}
                  <div
                    className="nb-outline-actions"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      marginLeft: "4px",
                      opacity: isModHovered ? 1 : 0,
                      pointerEvents: isModHovered ? "auto" : "none",
                    }}
                  >
                    {onToggleModuleWatched && mod.lessons.length > 0 && (() => {
                      const allWatched = mod.lessons.every((l) => l.watched);
                      return (
                        <button
                          type="button"
                          className="nb-outline-action-btn"
                          title={allWatched ? "Mark all pages in module unwatched" : "Mark all pages in module watched"}
                          aria-label={allWatched ? "Mark module unwatched" : "Mark module watched"}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSound.click();
                            onToggleModuleWatched(modIdx, !allWatched);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            opacity: 0.75,
                            color: isInk ? "#F0EDE4" : "#0A0A0A",
                            padding: "2px",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {allWatched ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      );
                    })()}
                    {onNewPageInModule && (
                      <button
                        type="button"
                        className="nb-outline-action-btn"
                        title="Add page in this module"
                        aria-label={`Add page in ${mod.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound.click();
                          onNewPageInModule(modIdx);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          opacity: 0.75,
                          color: isInk ? "#F0EDE4" : "#0A0A0A",
                          padding: "2px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    )}
                    {onRenameModule && (
                      <button
                        type="button"
                        className="nb-outline-action-btn"
                        title="Rename module"
                        aria-label={`Rename ${mod.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound.click();
                          setModuleTitleDraft(mod.title);
                          setEditingModuleId(mod.id);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          opacity: 0.75,
                          color: isInk ? "#F0EDE4" : "#0A0A0A",
                          padding: "2px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Pencil size={10} />
                      </button>
                    )}
                    {onDeleteModule && (
                      <button
                        type="button"
                        className="nb-outline-action-btn"
                        title="Delete module"
                        aria-label={`Delete ${mod.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound.click();
                          onDeleteModule(modIdx);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          opacity: 0.75,
                          color: "#EF4444",
                          padding: "2px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Lesson Items */}
              {!isCollapsed && (
                <div>
                  {mod.lessons.length === 0 && (
                    <div
                      style={{
                        padding: "12px",
                        border: isInk ? "2px dashed rgba(255,255,255,0.2)" : "2px dashed rgba(10,10,10,0.2)",
                        textAlign: "center",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        letterSpacing: "0.1em",
                        opacity: 0.45,
                        margin: "4px 0 8px",
                      }}
                    >
                      DROP PAGES HERE
                    </div>
                  )}

                  {/* Recursive Tree Node Renderer */}
                  {(() => {
                    const renderLessonNode = (les: SeedCourseLesson, level: number = 0) => {
                      const lesIdx = mod.lessons.findIndex((l) => isSameId(l.id, les.id));
                      const isSelected = modIdx === currentModuleIndex && lesIdx === currentLessonIndex;
                      const state = lessonState({ wordCount: computeWordCount(les.blocks || []) });
                      const isDraggingThis =
                        draggingInfo?.modIdx === modIdx && draggingInfo?.lesIdx === lesIdx;
                      const isRowHovered = hoveredLessonId === les.id;
                      const directChildren = mod.lessons.filter((l) => l.parentId && isSameId(l.parentId, les.id));
                      const hasChildren = directChildren.length > 0;
                      const isSubpagesCollapsed = Boolean(collapsedSubpages[les.id]);

                      const isDropBefore =
                        dropTarget?.modIdx === modIdx &&
                        dropTarget?.lesIdx === lesIdx &&
                        dropTarget?.position === "before";
                      const isDropAfter =
                        dropTarget?.modIdx === modIdx &&
                        dropTarget?.lesIdx === lesIdx &&
                        dropTarget?.position === "after";

                      return (
                        <div key={les.id} style={{ position: "relative" }}>
                          <div
                            style={{
                              position: "relative",
                              paddingLeft: `${level * 14}px`,
                              borderLeft: level > 0 ? (isInk ? "2px dotted rgba(255,255,255,0.2)" : "2px dotted rgba(10,10,10,0.25)") : "none",
                              marginLeft: level > 0 ? "8px" : "0",
                            }}
                            onMouseEnter={() => setHoveredLessonId(les.id)}
                            onMouseLeave={() => setHoveredLessonId(null)}
                            onDragOver={(e) => {
                              if (draggingInfo) {
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const midY = rect.top + rect.height / 2;
                                const pos = e.clientY < midY ? "before" : "after";
                                setDropTarget({ modIdx, lesIdx, position: pos });
                              }
                            }}
                            onDragLeave={() => {
                              if (dropTarget?.modIdx === modIdx && dropTarget?.lesIdx === lesIdx) {
                                setDropTarget(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggingInfo && onReorderLesson) {
                                const sourceModIdx = draggingInfo.modIdx;
                                const sourceLesIdx = draggingInfo.lesIdx;
                                let targetLesIdx = lesIdx;
                                if (dropTarget?.position === "after") {
                                  targetLesIdx = lesIdx + 1;
                                }
                                if (sourceModIdx === modIdx && sourceLesIdx < targetLesIdx) {
                                  targetLesIdx = Math.max(0, targetLesIdx - 1);
                                }
                                onReorderLesson(sourceModIdx, modIdx, sourceLesIdx, targetLesIdx);
                              }
                              setDraggingInfo(null);
                              setDropTarget(null);
                            }}
                          >
                            {/* Drop Target Indicator Line (Before) */}
                            {isDropBefore && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "-3px",
                                  left: "-9px",
                                  right: "-9px",
                                  height: "4px",
                                  background: "#FCE94F",
                                  border: isInk ? "1.5px solid #FFFFFF" : "1.5px solid #0A0A0A",
                                  zIndex: 10,
                                }}
                              />
                            )}

                            <div
                              className="nb-outline-row"
                              role="button"
                              tabIndex={0}
                              aria-current={isSelected ? "page" : undefined}
                              aria-label={`${les.title} (${state === "written" ? "written" : state === "stub" ? "draft" : "empty"}${les.watched ? ", watched" : ""})`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", les.id);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggingInfo({ modIdx, lesIdx, lessonId: les.id });
                                playSound.click();
                              }}
                              onDragEnd={() => {
                                setDraggingInfo(null);
                                setDropTarget(null);
                              }}
                              onClick={() => {
                                playSound.click();
                                onSelectLesson(modIdx, lesIdx);
                              }}
                              onKeyDown={(e) => {
                                if (e.target !== e.currentTarget) return;
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  playSound.click();
                                  onSelectLesson(modIdx, lesIdx);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                playSound.click();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActionMenu({
                                  modIdx,
                                  lesIdx,
                                  top: Math.min(e.clientY, window.innerHeight - 200),
                                  left: Math.min(e.clientX, window.innerWidth - 180),
                                });
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "7px",
                                padding: "6px 8px",
                                cursor: "pointer",
                                border: "2px solid",
                                borderColor: isSelected ? (isInk ? "#FCE94F" : "#0A0A0A") : "transparent",
                                background: isSelected ? (isInk ? "#242A38" : "#0A0A0A") : "transparent",
                                color: isSelected ? "#F3F0E8" : (isInk ? "#F0EDE4" : "#0A0A0A"),
                                margin: "0 -8px",
                                opacity: isDraggingThis ? 0.35 : 1,
                                transition: "background 0.1s ease, border-color 0.1s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected && !isDraggingThis) {
                                  e.currentTarget.style.background = isInk ? "#1E232F" : "#FFFFFF";
                                  e.currentTarget.style.borderColor = isInk ? "rgba(255,255,255,0.2)" : "#0A0A0A";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected && !isDraggingThis) {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.borderColor = "transparent";
                                }
                              }}
                            >
                              {/* Tree Chevron if has children */}
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playSound.click();
                                    setCollapsedSubpages((prev) => ({
                                      ...prev,
                                      [les.id]: !prev[les.id],
                                    }));
                                  }}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: isSelected ? "#F3F0E8" : (isInk ? "#F0EDE4" : "#0A0A0A"),
                                    cursor: "pointer",
                                    padding: 0,
                                    width: "14px",
                                    height: "14px",
                                    display: "grid",
                                    placeItems: "center",
                                    opacity: 0.8,
                                    transform: isSubpagesCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                                    transition: "transform 0.15s ease",
                                    flexShrink: 0,
                                  }}
                                >
                                  <ChevronRight size={11} />
                                </button>
                              ) : (
                                <div style={{ width: "14px", flexShrink: 0 }} />
                              )}

                              {/* State Status Square (Always preserved even when page has a custom emoji) */}
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  flexShrink: 0,
                                  userSelect: "none",
                                }}
                              >
                                <span
                                  aria-label={state === "written" ? "Written" : state === "stub" ? "Draft" : "Empty"}
                                  title={state === "written" ? "Written" : state === "stub" ? "Draft" : "Empty"}
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    border: isSelected ? "2px solid #F3F0E8" : (isInk ? "2px solid rgba(255,255,255,0.45)" : "2px solid #0A0A0A"),
                                    background:
                                      state === "written"
                                        ? "#B8F04A"
                                        : state === "stub"
                                        ? "repeating-linear-gradient(45deg, #FCE94F 0 3px, transparent 3px 6px)"
                                        : "transparent",
                                    display: "inline-block",
                                  }}
                                />
                                {les.icon && (
                                  <span style={{ fontSize: "12px", lineHeight: 1 }} aria-hidden="true">
                                    {les.icon}
                                  </span>
                                )}
                              </span>

                              <div style={{ flex: 1, minWidth: 0, fontSize: "13.5px", lineHeight: "1.3", fontWeight: isSelected ? 700 : 500 }}>
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    display: "block",
                                  }}
                                >
                                  {les.title}
                                </span>
                              </div>

                              {/* Child count pill if has subpages */}
                              {hasChildren && (
                                <span
                                  style={{
                                    fontFamily: "var(--mono, monospace)",
                                    fontSize: "8px",
                                    fontWeight: 800,
                                    padding: "0 4px",
                                    borderRadius: "2px",
                                    background: isInk ? "rgba(255,255,255,0.12)" : "rgba(10,10,10,0.08)",
                                    color: isSelected ? "#F3F0E8" : tokens.textSecondary,
                                    flexShrink: 0,
                                  }}
                                >
                                  {directChildren.length}
                                </span>
                              )}

                              {/* Row Actions (hover, focus-within, and always accessible on touch/mobile) */}
                              <div
                                className="nb-outline-actions"
                                data-open={actionMenu?.modIdx === modIdx && actionMenu?.lesIdx === lesIdx ? "true" : "false"}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  flexShrink: 0,
                                  opacity: isRowHovered || (actionMenu?.modIdx === modIdx && actionMenu?.lesIdx === lesIdx) ? 1 : 0,
                                }}
                              >
                                {onCreateSubpage && (
                                  <button
                                    type="button"
                                    className="nb-outline-action-btn"
                                    title="Add subpage under this page"
                                    aria-label={`Add subpage under ${les.title}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playSound.click();
                                      onCreateSubpage(les.id);
                                      setCollapsedSubpages((prev) => ({ ...prev, [les.id]: false }));
                                    }}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: isSelected ? "#F3F0E8" : (isInk ? "#F0EDE4" : "#0A0A0A"),
                                      cursor: "pointer",
                                      padding: "2px",
                                      display: "grid",
                                      placeItems: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="nb-outline-action-btn"
                                  title="Page options"
                                  aria-label={`Options for ${les.title}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playSound.click();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setActionMenu({
                                      modIdx,
                                      lesIdx,
                                      top: rect.bottom + 4,
                                      left: Math.min(rect.left - 130, window.innerWidth - 180),
                                    });
                                  }}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: isSelected ? "#F3F0E8" : (isInk ? "#F0EDE4" : "#0A0A0A"),
                                    cursor: "pointer",
                                    padding: "2px",
                                    display: "grid",
                                    placeItems: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Drop Target Indicator Line (After) */}
                            {isDropAfter && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "-3px",
                                  left: "-9px",
                                  right: "-9px",
                                  height: "4px",
                                  background: "#FCE94F",
                                  border: isInk ? "1.5px solid #FFFFFF" : "1.5px solid #0A0A0A",
                                  zIndex: 10,
                                }}
                              />
                            )}
                          </div>

                          {/* Recursive Subpages Container */}
                          {hasChildren && !isSubpagesCollapsed && (
                            <div style={{ position: "relative" }}>
                              {directChildren.map((child) => renderLessonNode(child, level + 1))}
                            </div>
                          )}
                        </div>
                      );
                    };

                    if (searchQuery.trim() !== "") {
                      return matchingLessons.map((les) => renderLessonNode(les, 0));
                    }

                    const hasParentInMod = (l: SeedCourseLesson) =>
                      Boolean(l.parentId && mod.lessons.some((p) => isSameId(p.id, l.parentId)));

                    return matchingLessons
                      .filter((l) => !hasParentInMod(l))
                      .map((rootLes) => renderLessonNode(rootLes, 0));
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Single Clean Action Menu Popover */}
      {actionMenu && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${actionMenu.top}px`,
            left: `${actionMenu.left}px`,
            zIndex: 99999,
            background: tokens.popoverBg,
            border: `2px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.popoverShadow,
            color: tokens.textPrimary,
            minWidth: "160px",
            padding: "4px 0",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            animation: "fadeIn 0.08s ease",
          }}
        >
          {onCreateLessonAbove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.click();
                const { modIdx, lesIdx } = actionMenu;
                setActionMenu(null);
                onCreateLessonAbove(modIdx, lesIdx);
              }}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                color: tokens.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ArrowUp size={11} />
              <span>Add Page Above</span>
            </button>
          )}

          {onCreateLessonBelow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.click();
                const { modIdx, lesIdx } = actionMenu;
                setActionMenu(null);
                onCreateLessonBelow(modIdx, lesIdx);
              }}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                color: tokens.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ArrowDown size={11} />
              <span>Add Page Below</span>
            </button>
          )}

          {onCreateSubpage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.click();
                const { modIdx, lesIdx } = actionMenu;
                const targetLes = courses[currentCourseIndex]?.modules[modIdx]?.lessons[lesIdx];
                setActionMenu(null);
                if (targetLes) {
                  onCreateSubpage(targetLes.id);
                  setCollapsedSubpages((prev) => ({ ...prev, [targetLes.id]: false }));
                }
              }}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                color: isInk ? "#FCE94F" : "#7B5CF0",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <CornerDownRight size={11} />
              <span>Add Subpage</span>
            </button>
          )}

          {onDuplicateLesson && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.click();
                const { modIdx, lesIdx } = actionMenu;
                setActionMenu(null);
                onDuplicateLesson(modIdx, lesIdx);
              }}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                color: tokens.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Copy size={11} />
              <span>Duplicate Page</span>
            </button>
          )}

          {onToggleWatched && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.click();
                const { modIdx, lesIdx } = actionMenu;
                setActionMenu(null);
                onToggleWatched(modIdx, lesIdx);
              }}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                color: tokens.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {course.modules[actionMenu.modIdx]?.lessons[actionMenu.lesIdx]?.watched ? (
                <>
                  <EyeOff size={11} />
                  <span>Mark Unwatched</span>
                </>
              ) : (
                <>
                  <Eye size={11} />
                  <span>Mark Watched</span>
                </>
              )}
            </button>
          )}

          <div style={{ height: "1px", background: tokens.borderSubtle, margin: "3px 0" }} />

          {onDeleteLesson && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.click();
                const { modIdx, lesIdx } = actionMenu;
                setActionMenu(null);
                onDeleteLesson(modIdx, lesIdx);
              }}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                color: "#EF4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Trash2 size={11} />
              <span>Delete Page</span>
            </button>
          )}
        </div>
      )}

      {/* Sidebar Footer Action Buttons */}
      <div style={{ padding: "16px 18px 0", marginTop: "12px", borderTop: `2px solid ${tokens.borderSubtle}`, flexShrink: 0 }}>
        {/* Add Page Button */}
        <button
          type="button"
          onClick={onNewPage}
          style={{
            width: "100%",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.13em",
            border: `2px solid ${tokens.borderPrimary}`,
            background: tokens.accentColor,
            color: tokens.accentFg,
            padding: "9px",
            cursor: "pointer",
            boxShadow: tokens.boxShadow,
            marginBottom: "8px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          ＋ ADD A PAGE
        </button>

        {/* Add Module Button */}
        {onCreateModule && (
          <button
            type="button"
            onClick={onCreateModule}
            style={{
              width: "100%",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              border: `2px solid ${tokens.borderPrimary}`,
              background: tokens.cardBg,
              color: tokens.textPrimary,
              padding: "9px",
              cursor: "pointer",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = tokens.cardBg)}
          >
            <FolderPlus size={12} />
            <span>＋ ADD A MODULE</span>
          </button>
        )}

        <button
          type="button"
          onClick={onBackToIndex}
          style={{
            width: "100%",
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            border: isInk ? "2px solid rgba(255,255,255,0.2)" : "2px solid #0A0A0A",
            background: "transparent",
            color: isInk ? "#F0EDE4" : "#0A0A0A",
            padding: "8px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = isInk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          ← ALL NOTEBOOKS
        </button>
      </div>
    </aside>
  );
};
