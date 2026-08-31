"use client";

import React from "react";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { lessonState, computeWordCount } from "@/lib/notebooks/blocks";

interface CourseCardProps {
  course: SeedCourse;
  onClick: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
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
        border: "3px solid #0A0A0A",
        background: "#FFFFFF",
        boxShadow: `8px 8px 0 ${course.accent}, 16px 16px 0 #0A0A0A`,
        cursor: "pointer",
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(-3px, -3px)";
        e.currentTarget.style.boxShadow = `11px 11px 0 ${course.accent}, 22px 22px 0 #0A0A0A`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translate(0, 0)";
        e.currentTarget.style.boxShadow = `8px 8px 0 ${course.accent}, 16px 16px 0 #0A0A0A`;
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
            position: "relative",
            fontFamily: "var(--mono, monospace)",
            fontSize: "8.5px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            opacity: 0.8,
            marginBottom: "9px",
          }}
        >
          {course.provider} · IN PROGRESS
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
      <div style={{ padding: "16px 20px", flex: 1, color: "#0A0A0A" }}>
        <div style={{ marginBottom: "14px" }}>
          {/* Two-Segment Progress Bar */}
          <div
            style={{
              display: "flex",
              height: "12px",
              border: "2px solid #0A0A0A",
              marginBottom: "6px",
              background: "#FFFFFF",
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
              opacity: 0.55,
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
            <span style={{ display: "block", fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.45, marginTop: "5px" }}>
              PAGES
            </span>
          </div>
          <div>
            <b style={{ display: "block", fontFamily: "var(--display, sans-serif)", fontWeight: 800, fontSize: "23px", lineHeight: 1 }}>
              {tilCandidateCount}
            </b>
            <span style={{ display: "block", fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.45, marginTop: "5px" }}>
              → TIL
            </span>
          </div>
          <div>
            <b style={{ display: "block", fontFamily: "var(--display, sans-serif)", fontWeight: 800, fontSize: "23px", lineHeight: 1 }}>
              {stubCount}
            </b>
            <span style={{ display: "block", fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.45, marginTop: "5px" }}>
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
          borderTop: "2px solid rgba(10,10,10,0.14)",
          background: "#EBE7DC",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#0A0A0A",
        }}
      >
        <span style={{ opacity: 0.55 }}>TOUCHED RECENTLY</span>
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
