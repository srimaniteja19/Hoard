"use client";

import React, { useState } from "react";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { lessonState, computeWordCount } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface OutlineSidebarProps {
  courses: SeedCourse[];
  currentCourseIndex: number;
  currentModuleIndex: number;
  currentLessonIndex: number;
  onSelectCourse: (index: number) => void;
  onSelectLesson: (moduleIndex: number, lessonIndex: number) => void;
  onDeleteLesson?: (moduleIndex: number, lessonIndex: number) => void;
  onToggleWatched?: (moduleIndex: number, lessonIndex: number) => void;
  onDuplicateLesson?: (moduleIndex: number, lessonIndex: number) => void;
  onReorderLesson?: (
    sourceModuleIndex: number,
    targetModuleIndex: number,
    sourceLessonIndex: number,
    targetLessonIndex: number
  ) => void;
  onEditCourse?: () => void;
  onDeleteCourse?: () => void;
  onBackToIndex: () => void;
  onNewPage: () => void;
}

export const OutlineSidebar: React.FC<OutlineSidebarProps> = ({
  courses,
  currentCourseIndex,
  currentModuleIndex,
  currentLessonIndex,
  onSelectCourse,
  onSelectLesson,
  onDeleteLesson,
  onToggleWatched,
  onDuplicateLesson,
  onReorderLesson,
  onEditCourse,
  onDeleteCourse,
  onBackToIndex,
  onNewPage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

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

  return (
    <aside
      style={{
        borderRight: "3px solid #0A0A0A",
        background: "#EBE7DC",
        padding: "0 0 60px",
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      {/* Course Switcher Tabs */}
      <div style={{ display: "flex", borderBottom: "3px solid #0A0A0A", flexShrink: 0 }}>
        {courses.map((c, idx) => {
          const isSelected = idx === currentCourseIndex;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                playSound.click();
                onSelectCourse(idx);
              }}
              style={{
                flex: 1,
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: isSelected ? c.accent : "transparent",
                color: isSelected ? c.accentFg : "#0A0A0A",
                border: "none",
                borderRight: idx < courses.length - 1 ? "2px solid #0A0A0A" : "none",
                padding: "11px 6px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "background 0.1s ease",
              }}
            >
              {c.title}
            </button>
          );
        })}
      </div>

      {/* Course Header Banner */}
      <div style={{ padding: "18px", borderBottom: "2px solid rgba(10,10,10,0.14)", color: "#0A0A0A", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "11px" }}>
          <span
            style={{
              display: "inline-block",
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              background: course.accent,
              color: course.accentFg,
              border: "2px solid #0A0A0A",
              padding: "3px 8px",
            }}
          >
            COURSE · IN PROGRESS
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {onEditCourse && (
              <button
                type="button"
                onClick={onEditCourse}
                title="Edit Course"
                style={{
                  background: "transparent",
                  border: "1.5px solid #0A0A0A",
                  color: "#0A0A0A",
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Pencil size={10} />
                EDIT
              </button>
            )}
            {onDeleteCourse && (
              <button
                type="button"
                onClick={onDeleteCourse}
                title="Delete Course"
                style={{
                  background: "transparent",
                  border: "1.5px solid #0A0A0A",
                  color: "#DC2626",
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#DC2626";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#DC2626";
                }}
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>
        <h2
          style={{
            margin: "0 0 4px",
            fontFamily: "var(--display, sans-serif)",
            fontWeight: 800,
            fontSize: "23px",
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
          }}
        >
          {course.title}
        </h2>
        <div style={{ fontFamily: "var(--quote, Georgia, serif)", fontStyle: "italic", fontSize: "15px", opacity: 0.6 }}>
          {course.provider}
        </div>

        {/* Mini Two-segment Progress */}
        <div
          style={{
            height: "8px",
            border: "2px solid #0A0A0A",
            background: "#FFFFFF",
            marginTop: "13px",
            display: "flex",
            overflow: "hidden",
          }}
        >
          <i style={{ width: `${writtenPct}%`, background: "#B8F04A", display: "block" }} />
          <em
            style={{
              width: `${unwrittenPct}%`,
              background: "repeating-linear-gradient(45deg, #FCE94F 0 5px, rgba(0,0,0,0.2) 5px 10px)",
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
            opacity: 0.55,
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pages…"
            style={{
              width: "100%",
              padding: "6px 9px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 600,
              border: "1.5px solid #0A0A0A",
              background: "#FFFFFF",
              color: "#0A0A0A",
              outline: "none",
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
            l.meta.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (matchingLessons.length === 0 && searchQuery.trim()) return null;

          const modWritten = mod.lessons.filter(
            (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) === "written"
          ).length;

          const isModuleDragOver = dragOverModuleIdx === modIdx && mod.lessons.length === 0;

          return (
            <div
              key={mod.id}
              style={{
                padding: "14px 18px 0",
                background: isModuleDragOver ? "rgba(252, 233, 79, 0.2)" : "transparent",
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
              {/* Module Header with Collapse Toggle */}
              <div
                onClick={() => toggleModuleCollapse(mod.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  opacity: 0.65,
                  marginBottom: isCollapsed ? "4px" : "8px",
                  color: "#0A0A0A",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <span style={{ display: "flex", alignItems: "center" }}>
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </span>
                <span>{mod.title}</span>
                <span style={{ flex: 1, height: "2px", background: "rgba(10,10,10,0.14)" }} />
                <span>
                  {modWritten}/{mod.lessons.length}
                </span>
              </div>

              {/* Lesson Items */}
              {!isCollapsed && (
                <div>
                  {mod.lessons.length === 0 && (
                    <div
                      style={{
                        padding: "12px",
                        border: "2px dashed rgba(10,10,10,0.2)",
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

                  {matchingLessons.map((les) => {
                    const lesIdx = mod.lessons.findIndex((l) => l.id === les.id);
                    const isSelected = modIdx === currentModuleIndex && lesIdx === currentLessonIndex;
                    const state = lessonState({ wordCount: computeWordCount(les.blocks || []) });
                    const isDraggingThis =
                      draggingInfo?.modIdx === modIdx && draggingInfo?.lesIdx === lesIdx;

                    const isDropBefore =
                      dropTarget?.modIdx === modIdx &&
                      dropTarget?.lesIdx === lesIdx &&
                      dropTarget?.position === "before";
                    const isDropAfter =
                      dropTarget?.modIdx === modIdx &&
                      dropTarget?.lesIdx === lesIdx &&
                      dropTarget?.position === "after";

                    return (
                      <div
                        key={les.id}
                        style={{ position: "relative" }}
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
                            // Adjust index if moving within same module down the list
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
                              border: "1.5px solid #0A0A0A",
                              zIndex: 10,
                            }}
                          />
                        )}

                        <div
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
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                            padding: "7px 9px",
                            cursor: "pointer",
                            border: "2px solid",
                            borderColor: isSelected ? "#0A0A0A" : "transparent",
                            background: isSelected ? "#0A0A0A" : "transparent",
                            color: isSelected ? "#F3F0E8" : "#0A0A0A",
                            margin: "0 -9px",
                            opacity: isDraggingThis ? 0.35 : 1,
                            transition: "background 0.1s ease, border-color 0.1s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected && !isDraggingThis) {
                              e.currentTarget.style.background = "#FFFFFF";
                              e.currentTarget.style.borderColor = "#0A0A0A";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected && !isDraggingThis) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = "transparent";
                            }
                          }}
                        >
                          {/* State Status Square */}
                          <span
                            style={{
                              width: "11px",
                              height: "11px",
                              border: isSelected ? "2px solid #F3F0E8" : "2px solid #0A0A0A",
                              flex: "none",
                              marginTop: "5px",
                              background:
                                state === "written"
                                  ? "#B8F04A"
                                  : state === "stub"
                                  ? "repeating-linear-gradient(45deg, #FCE94F 0 3px, transparent 3px 6px)"
                                  : "transparent",
                            }}
                          />

                          <div style={{ flex: 1, minWidth: 0, fontSize: "14.5px", lineHeight: "1.32", fontWeight: 500 }}>
                            {les.title}
                            <em
                              style={{
                                display: "block",
                                fontStyle: "normal",
                                fontFamily: "var(--mono, monospace)",
                                fontSize: "8.5px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                opacity: isSelected ? 0.7 : 0.45,
                                marginTop: "3px",
                              }}
                            >
                              {les.meta}
                            </em>
                          </div>

                          {/* Quick Duplicate Page Button */}
                          {onDuplicateLesson && (
                            <button
                              type="button"
                              title="Duplicate Page"
                              onClick={(e) => {
                                e.stopPropagation();
                                playSound.click();
                                onDuplicateLesson(modIdx, lesIdx);
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: isSelected ? "#F3F0E8" : "#0A0A0A",
                                opacity: 0.35,
                                cursor: "pointer",
                                padding: "2px 4px",
                                marginTop: "2px",
                                display: "grid",
                                placeItems: "center",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.35")}
                            >
                              <Copy size={11} />
                            </button>
                          )}

                          {onToggleWatched && (
                            <button
                              type="button"
                              title={les.watched ? "Mark as not watched" : "Mark as watched"}
                              onClick={(e) => {
                                e.stopPropagation();
                                playSound.click();
                                onToggleWatched(modIdx, lesIdx);
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: isSelected ? "#F3F0E8" : "#0A0A0A",
                                opacity: les.watched ? 0.6 : 0.3,
                                cursor: "pointer",
                                padding: "2px 4px",
                                marginTop: "2px",
                                display: "grid",
                                placeItems: "center",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = les.watched ? "0.6" : "0.3")}
                            >
                              {les.watched ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                          )}

                          {onDeleteLesson && (
                            <button
                              type="button"
                              title={`Delete ${les.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLesson(modIdx, lesIdx);
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: isSelected ? "#F3F0E8" : "#991B1B",
                                opacity: 0.35,
                                cursor: "pointer",
                                fontSize: "11px",
                                padding: "2px 4px",
                                marginTop: "2px",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.35")}
                            >
                              ✕
                            </button>
                          )}
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
                              border: "1.5px solid #0A0A0A",
                              zIndex: 10,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer Action Buttons */}
      <div style={{ padding: "16px 18px 0", marginTop: "12px", borderTop: "2px solid rgba(10,10,10,0.14)", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onNewPage}
          style={{
            width: "100%",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            border: "2px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            padding: "9px",
            cursor: "pointer",
            boxShadow: "3px 3px 0 #0A0A0A",
            marginBottom: "10px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          ＋ ADD A PAGE
        </button>

        <button
          type="button"
          onClick={onBackToIndex}
          style={{
            width: "100%",
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            border: "2px solid #0A0A0A",
            background: "transparent",
            color: "#0A0A0A",
            padding: "8px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          ← ALL NOTEBOOKS
        </button>
      </div>
    </aside>
  );
};
