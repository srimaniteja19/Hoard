"use client";

import React from "react";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { lessonState, computeWordCount } from "@/lib/notebooks/blocks";

import { Pencil, Trash2 } from "lucide-react";

import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";

interface CourseCardProps {
  course: SeedCourse;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  theme?: NotebookTheme;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick, onEdit, onDelete, theme = "cream" }) => {
  const tokens = getThemeTokens(theme);
  const isDark = tokens.isDark;

  // Aggregate all lessons across modules
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;

  const writtenCount = allLessons.filter(
    (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) === "written"
  ).length;

  const unwrittenCount = allLessons.filter(
    (l) => l.watched && lessonState({ wordCount: computeWordCount(l.blocks || []) }) !== "written"
  ).length;
  const stubCount = allLessons.filter(
    (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) === "stub"
  ).length;
  const pagesCount = allLessons.filter(
    (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) !== "empty"
  ).length;
  // Real count of "fact"/"connects" callouts — the blocks a writer tagged as
  // takeaways worth promoting to a TIL claim, rather than a fabricated number.
  const tilCandidateCount = allLessons.reduce(
    (sum, l) =>
      sum +
      (l.blocks || []).filter((b) => b.type === "callout" && (b.kind === "fact" || b.kind === "connects")).length,
    0
  );

  const writtenPct = totalLessons > 0 ? (writtenCount / totalLessons) * 100 : 0;
  const unwrittenPct = totalLessons > 0 ? (unwrittenCount / totalLessons) * 100 : 0;

  return (
    <div
      onClick={onClick}
      style={{
        border: `3px solid ${tokens.borderPrimary}`,
        background: tokens.cardBg,
        boxShadow: isDark
          ? `6px 6px 0 ${course.accent}, 12px 12px 0 rgba(0,0,0,0.8)`
          : `8px 8px 0 ${course.accent}, 16px 16px 0 #0A0A0A`,
        cursor: "pointer",
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
        display: "flex",
        flexDirection: "column",
        color: tokens.textPrimary,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(-3px, -3px)";
        e.currentTarget.style.boxShadow = isDark
          ? `8px 8px 0 ${course.accent}, 16px 16px 0 rgba(0,0,0,0.9)`
          : `11px 11px 0 ${course.accent}, 22px 22px 0 #0A0A0A`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translate(0, 0)";
        e.currentTarget.style.boxShadow = isDark
          ? `6px 6px 0 ${course.accent}, 12px 12px 0 rgba(0,0,0,0.8)`
          : `8px 8px 0 ${course.accent}, 16px 16px 0 #0A0A0A`;
      }}
    >
      {/* Top Banner with Ghost Initial */}
      <div
        style={{
          background: course.accent,
          borderBottom: "3px solid #0A0A0A",
          padding: "18px 20px",
          color: course.accentFg,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            right: "-16px",
            bottom: "-46px",
            fontFamily: "var(--display, sans-serif)",
            fontWeight: 800,
            fontSize: "150px",
            lineHeight: 1,
            letterSpacing: "-0.08em",
            color: "rgba(0,0,0,0.15)",
            pointerEvents: "none",
          }}
        >
          {course.init}
        </span>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
            marginBottom: "9px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              opacity: 0.8,
            }}
          >
            {course.provider} · IN PROGRESS
          </div>
          {(onEdit || onDelete) && (
            <div style={{ display: "flex", gap: "5px", zIndex: 5 }} onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <button
                  type="button"
                  title="Edit Course Details"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(0,0,0,0.3)",
                    color: course.accentFg,
                    padding: "3px 6px",
                    cursor: "pointer",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "8.5px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0A0A0A")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.2)")}
                >
                  <Pencil size={10} />
                  EDIT
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  title="Delete Course"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(0,0,0,0.3)",
                    color: course.accentFg,
                    padding: "3px 6px",
                    cursor: "pointer",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "8.5px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#DC2626")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.2)")}
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          )}
        </div>
        <h2
          style={{
            position: "relative",
            margin: 0,
            fontFamily: "var(--display, sans-serif)",
            fontWeight: 800,
            fontSize: "30px",
            lineHeight: 0.98,
            letterSpacing: "-0.045em",
          }}
        >
          {course.title}
        </h2>
      </div>

      {/* Body & Progress Bars */}
      <div style={{ padding: "16px 20px", flex: 1, color: tokens.textPrimary }}>
        <div style={{ marginBottom: "14px" }}>
          {/* Two-Segment Progress Bar */}
          <div
            style={{
              display: "flex",
              height: "12px",
              border: `2px solid ${tokens.borderPrimary}`,
              marginBottom: "6px",
              background: isDark ? "#121214" : "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <i
              style={{
                width: `${writtenPct}%`,
                background: "#B8F04A", // solid lime for written
                display: "block",
                height: "100%",
              }}
            />
            <em
              style={{
                width: `${unwrittenPct}%`,
                background: "repeating-linear-gradient(45deg, #FCE94F 0 5px, rgba(0,0,0,0.2) 5px 10px)", // yellow hatch for unwritten
                display: "block",
                height: "100%",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
              fontWeight: 700,
              letterSpacing: "0.11em",
              color: tokens.textSecondary,
              marginBottom: "11px",
            }}
          >
            <span>{writtenCount} WRITTEN</span>
            <span>{unwrittenCount} WATCHED, UNWRITTEN</span>
            <span>{totalLessons} LESSONS</span>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: "22px", flexWrap: "wrap" }}>
          <div>
            <b style={{ display: "block", fontFamily: "var(--display, sans-serif)", fontWeight: 800, fontSize: "23px", lineHeight: 1 }}>
              {pagesCount}
            </b>
            <span style={{ display: "block", fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", color: tokens.textMuted, marginTop: "5px" }}>
              PAGES
            </span>
          </div>
          <div>
            <b style={{ display: "block", fontFamily: "var(--display, sans-serif)", fontWeight: 800, fontSize: "23px", lineHeight: 1 }}>
              {tilCandidateCount}
            </b>
            <span style={{ display: "block", fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", color: tokens.textMuted, marginTop: "5px" }}>
              → TIL
            </span>
          </div>
          <div>
            <b style={{ display: "block", fontFamily: "var(--display, sans-serif)", fontWeight: 800, fontSize: "23px", lineHeight: 1 }}>
              {stubCount}
            </b>
            <span style={{ display: "block", fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", color: tokens.textMuted, marginTop: "5px" }}>
              STUBS
            </span>
          </div>
        </div>
      </div>

      {/* Footer with Unwritten Warning Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 20px",
          borderTop: `2px solid ${tokens.borderSubtle}`,
          background: isDark ? "#141417" : "#EBE7DC",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: tokens.textPrimary,
        }}
      >
        <span style={{ color: tokens.textSecondary }}>TOUCHED RECENTLY</span>
        <span style={{ flex: 1 }} />
        {unwrittenCount > 0 && (
          <span
            style={{
              background: "#FF2D8A",
              color: "#FFFFFF",
              padding: "2px 7px",
              letterSpacing: "0.1em",
            }}
          >
            {unwrittenCount} UNWRITTEN
          </span>
        )}
      </div>
    </div>
  );
};
