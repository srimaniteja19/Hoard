"use client";

import React from "react";
import { CourseCollision } from "@/lib/notebooks/seedData";
import { playSound } from "@/lib/sound";

interface CollisionsPanelProps {
  collisions: CourseCollision[];
  onSelectSource?: (courseTitle: string, lessonTitle: string) => void;
}

export const CollisionsPanel: React.FC<CollisionsPanelProps> = ({
  collisions,
  onSelectSource,
}) => {
  return (
    <div
      style={{
        border: "3px solid #0A0A0A",
        background: "#0A0A0A",
        color: "#F0EDE4",
        boxShadow: "8px 8px 0 #7FE9F7",
        margin: "40px 0 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          fontFamily: "var(--mono, monospace)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.19em",
          padding: "11px 16px",
          borderBottom: "2px solid rgba(240,237,228,0.28)",
          color: "#7FE9F7",
        }}
      >
        <span>WHERE THE COURSES TOUCH</span>
        <span>{collisions.length} COLLISIONS FOUND</span>
      </div>

      {collisions.map((col, idx) => (
        <div
          key={col.id || idx}
          className="nb-collisions-row"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "16px",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom: idx < collisions.length - 1 ? "2px solid rgba(240,237,228,0.13)" : "none",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <b
                style={{
                  display: "block",
                  fontFamily: "var(--display, sans-serif)",
                  fontWeight: 800,
                  fontSize: "18px",
                  letterSpacing: "-0.028em",
                  lineHeight: 1.15,
                  color: "#FFFFFF",
                }}
              >
                {col.title}
              </b>
              {col.relation && (
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "8px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "2px 6px",
                    border: "1.5px solid rgba(240,237,228,0.4)",
                    color: col.relation === "contradiction" ? "#FF2D8A" : "#F0EDE4",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.relation.replace(/-/g, " ").toUpperCase()}
                </span>
              )}
            </div>
            <p style={{ margin: "5px 0 0", fontSize: "14.5px", lineHeight: 1.5, color: "rgba(240, 237, 228, 0.82)" }}>
              {col.description}
            </p>
          </div>
          <div
            className="nb-collisions-links"
            style={{
              display: "flex",
              gap: "7px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              flex: "none",
              maxWidth: "100%",
            }}
          >
            <button
              type="button"
              disabled={!onSelectSource}
              onClick={() => {
                if (!onSelectSource) return;
                playSound.click();
                onSelectSource(col.sourceA.course, col.sourceA.lesson);
              }}
              title={onSelectSource ? `Open ${col.sourceA.course} · ${col.sourceA.lesson}` : undefined}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "8.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "2px solid #5B3FD9",
                background: "#5B3FD9",
                color: "#FFFFFF",
                padding: "4px 9px",
                cursor: onSelectSource ? "pointer" : "default",
                overflowWrap: "anywhere",
                textAlign: "left",
                minHeight: "30px",
              }}
            >
              {col.sourceA.course} · {col.sourceA.lesson} →
            </button>
            <button
              type="button"
              disabled={!onSelectSource}
              onClick={() => {
                if (!onSelectSource) return;
                playSound.click();
                onSelectSource(col.sourceB.course, col.sourceB.lesson);
              }}
              title={onSelectSource ? `Open ${col.sourceB.course} · ${col.sourceB.lesson}` : undefined}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "8.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "2px solid #FF9E2C",
                background: "#FF9E2C",
                color: "#0A0A0A",
                padding: "4px 9px",
                cursor: onSelectSource ? "pointer" : "default",
                overflowWrap: "anywhere",
                textAlign: "left",
                minHeight: "30px",
              }}
            >
              {col.sourceB.course} · {col.sourceB.lesson} →
            </button>
          </div>
        </div>
      ))}

      <div
        style={{
          padding: "10px 16px",
          borderTop: "2px solid rgba(240,237,228,0.28)",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          lineHeight: 1.8,
          color: "rgba(240, 237, 228, 0.78)",
        }}
      >
        FOUND BY MATCHING YOUR OWN WORDS ACROSS NOTEBOOKS — NOT THE SYLLABI. THIS IS THE REASON TWO COURSES LIVE IN ONE SYSTEM RATHER THAN TWO APPS.
      </div>
    </div>
  );
};
