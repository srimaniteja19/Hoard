"use client";

import React, { useState } from "react";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { lessonState, computeWordCount } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

interface OutlineSidebarProps {
  courses: SeedCourse[];
  currentCourseIndex: number;
  currentModuleIndex: number;
  currentLessonIndex: number;
  onSelectCourse: (index: number) => void;
  onSelectLesson: (moduleIndex: number, lessonIndex: number) => void;
  onDeleteLesson?: (moduleIndex: number, lessonIndex: number) => void;
  onToggleWatched?: (moduleIndex: number, lessonIndex: number) => void;
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
  onEditCourse,
  onDeleteCourse,
  onBackToIndex,
  onNewPage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const course = courses[currentCourseIndex] || courses[0];
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
          const matchingLessons = mod.lessons.filter((l) =>
            !searchQuery.trim() ||
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.meta.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (matchingLessons.length === 0) return null;

          const modWritten = mod.lessons.filter(
            (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) === "written"
          ).length;

          return (
            <div key={mod.id} style={{ padding: "14px 18px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  opacity: 0.45,
                  marginBottom: "8px",
                  color: "#0A0A0A",
                }}
              >
                <span>{mod.title}</span>
                <span style={{ flex: 1, height: "2px", background: "rgba(10,10,10,0.14)" }} />
                <span>
                  {modWritten}/{mod.lessons.length}
                </span>
              </div>

              {/* Lesson Items */}
              {matchingLessons.map((les) => {
                const lesIdx = mod.lessons.findIndex((l) => l.id === les.id);
                const isSelected = modIdx === currentModuleIndex && lesIdx === currentLessonIndex;
                const state = lessonState({ wordCount: computeWordCount(les.blocks || []) });

                return (
                  <div
                    key={les.id}
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
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#FFFFFF";
                        e.currentTarget.style.borderColor = "#0A0A0A";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
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
                          opacity: les.watched ? 0.55 : 0.3,
                          cursor: "pointer",
                          padding: "2px 4px",
                          marginTop: "2px",
                          display: "grid",
                          placeItems: "center",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = les.watched ? "0.55" : "0.3")}
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
                );
              })}
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
            marginBottom: "8px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          ＋ NEW PAGE
        </button>
        <button
          type="button"
          onClick={onBackToIndex}
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
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          ← ALL NOTEBOOKS
        </button>
      </div>
    </aside>
  );
};
